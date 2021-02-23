package connect

import (
	"context"
	"fmt"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/porter-dev/porter/cli/cmd/utils"
)

func Dockerhub(
	client *api.Client,
	projectID uint,
) (uint, error) {
	// if project ID is 0, ask the user to set the project ID or create a project
	if projectID == 0 {
		return 0, fmt.Errorf("no project set, please run porter project set [id]")
	}

	// query for helm repo name
	repoName, err := utils.PromptPlaintext(fmt.Sprintf(`Provide the image path: `))

	if err != nil {
		return 0, err
	}

	username, err := utils.PromptPlaintext(fmt.Sprintf(`Username: `))

	if err != nil {
		return 0, err
	}

	password, err := utils.PromptPasswordWithConfirmation()

	if err != nil {
		return 0, err
	}

	// create the basic auth integration
	integration, err := client.CreateBasicAuthIntegration(
		context.Background(),
		projectID,
		&api.CreateBasicAuthIntegrationRequest{
			Username: username,
			Password: password,
		},
	)

	if err != nil {
		return 0, err
	}

	color.New(color.FgGreen).Printf("created basic auth integration with id %d\n", integration.ID)

	reg, err := client.CreatePrivateRegistry(
		context.Background(),
		projectID,
		&api.CreatePrivateRegistryRequest{
			URL:                fmt.Sprintf("docker.io/%s", repoName),
			Name:               repoName,
			BasicIntegrationID: integration.ID,
		},
	)

	if err != nil {
		return 0, err
	}

	color.New(color.FgGreen).Printf("created private registry with id %d and name %s\n", reg.ID, reg.Name)

	return reg.ID, nil
}
