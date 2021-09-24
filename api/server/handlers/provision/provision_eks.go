package provision

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

type ProvisionEKSHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewProvisionEKSHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ProvisionEKSHandler {
	return &ProvisionEKSHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *ProvisionEKSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the user and project from context
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.CreateEKSInfraRequest{
		ProjectID: proj.ID,
	}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// get the AWS integration
	awsInt, err := c.Repo().AWSIntegration().ReadAWSIntegration(proj.ID, request.AWSIntegrationID)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		} else {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		}

		return
	}

	suffix, err := repository.GenerateRandomBytes(6)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	infra := &models.Infra{
		Kind:             types.InfraEKS,
		ProjectID:        proj.ID,
		Suffix:           suffix,
		Status:           types.StatusCreating,
		AWSIntegrationID: request.AWSIntegrationID,
		CreatedByUserID:  user.ID,
	}

	// handle write to the database
	infra, err = c.Repo().Infra().CreateInfra(infra)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// launch provisioning pod
	_, err = c.Config().ProvisionerAgent.ProvisionEKS(
		&kubernetes.SharedProvisionOpts{
			ProjectID:           proj.ID,
			Repo:                c.Repo(),
			Infra:               infra,
			Operation:           provisioner.Apply,
			PGConf:              c.Config().DBConf,
			RedisConf:           c.Config().RedisConf,
			ProvImageTag:        c.Config().ServerConf.ProvisionerImageTag,
			ProvImagePullSecret: c.Config().ServerConf.ProvisionerImagePullSecret,
		},
		awsInt,
		request.EKSName,
		request.MachineType,
	)

	if err != nil {
		infra.Status = types.StatusError
		infra, _ = c.Repo().Infra().UpdateInfra(infra)
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.Config().AnalyticsClient.Track(analytics.ClusterProvisioningStartTrack(
		&analytics.ClusterProvisioningStartTrackOpts{
			ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, proj.ID),
			ClusterType:            types.InfraEKS,
			InfraID:                infra.ID,
		},
	))

	c.WriteResult(w, r, infra.ToInfraType())
}
