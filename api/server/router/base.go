package router

import (
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/gitinstallation"
	"github.com/porter-dev/porter/api/server/handlers/healthcheck"
	"github.com/porter-dev/porter/api/server/handlers/metadata"
	"github.com/porter-dev/porter/api/server/handlers/release"
	"github.com/porter-dev/porter/api/server/handlers/user"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

func NewBaseRegisterer(children ...*Registerer) *Registerer {
	return &Registerer{
		GetRoutes: GetBaseRoutes,
		Children:  children,
	}
}

func GetBaseRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*Registerer,
) []*Route {
	routes := make([]*Route, 0)

	// GET /api/readyz -> healthcheck.NewReadyzHandler
	getReadyzEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/readyz",
			},
			Quiet: true,
		},
	)

	getReadyzHandler := healthcheck.NewReadyzHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getReadyzEndpoint,
		Handler:  getReadyzHandler,
		Router:   r,
	})

	// GET /api/livez -> healthcheck.NewLivezHandler
	getLivezEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/livez",
			},
			Quiet: true,
		},
	)

	getLivezHandler := healthcheck.NewLivezHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getLivezEndpoint,
		Handler:  getLivezHandler,
		Router:   r,
	})

	// GET /api/capabilities -> user.NewUserCreateHandler
	getMetadataEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/metadata",
			},
		},
	)

	getMetadataHandler := metadata.NewMetadataGetHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getMetadataEndpoint,
		Handler:  getMetadataHandler,
		Router:   r,
	})

	// GET /api/integrations/cluster -> metadata.NewListClusterIntegrationsHandler
	listClusterIntsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/integrations/cluster",
			},
		},
	)

	listClusterIntsHandler := metadata.NewListClusterIntegrationsHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: listClusterIntsEndpoint,
		Handler:  listClusterIntsHandler,
		Router:   r,
	})

	// GET /api/integrations/registry -> metadata.NewListRegistryIntegrationsHandler
	listRegistryIntsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/integrations/registry",
			},
		},
	)

	listRegistryIntsHandler := metadata.NewListRegistryIntegrationsHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: listRegistryIntsEndpoint,
		Handler:  listRegistryIntsHandler,
		Router:   r,
	})

	// GET /api/integrations/helm -> metadata.NewListHelmRepoIntegrationsHandler
	listHelmRepoIntsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/integrations/helm",
			},
		},
	)

	listHelmRepoIntsHandler := metadata.NewListHelmRepoIntegrationsHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: listHelmRepoIntsEndpoint,
		Handler:  listHelmRepoIntsHandler,
		Router:   r,
	})

	// POST /api/users -> user.NewUserCreateHandler
	createUserEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/users",
			},
		},
	)

	createUserHandler := user.NewUserCreateHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: createUserEndpoint,
		Handler:  createUserHandler,
		Router:   r,
	})

	// POST /api/login -> user.NewUserLoginHandler
	loginUserEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/login",
			},
		},
	)

	loginUserHandler := user.NewUserLoginHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: loginUserEndpoint,
		Handler:  loginUserHandler,
		Router:   r,
	})

	// POST /api/cli/login/exchange -> user.NewCLILoginExchangeHandler
	cliLoginExchangeEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/cli/login/exchange",
			},
		},
	)

	cliLoginExchangeHandler := user.NewCLILoginExchangeHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: cliLoginExchangeEndpoint,
		Handler:  cliLoginExchangeHandler,
		Router:   r,
	})

	// POST /api/password/reset/initiate -> user.NewUserPasswordInitiateResetHandler
	passwordInitiateResetEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/password/reset/initiate",
			},
		},
	)

	passwordInitiateResetHandler := user.NewUserPasswordInitiateResetHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: passwordInitiateResetEndpoint,
		Handler:  passwordInitiateResetHandler,
		Router:   r,
	})

	// POST /api/password/reset/verify -> user.NewUserPasswordVerifyResetHandler
	passwordVerifyResetEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/password/reset/verify",
			},
		},
	)

	passwordVerifyResetHandler := user.NewUserPasswordVerifyResetHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: passwordVerifyResetEndpoint,
		Handler:  passwordVerifyResetHandler,
		Router:   r,
	})

	// POST /api/password/reset/finalize -> user.NewUserPasswordFinalizeResetHandler
	passwordFinalizeResetEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/password/reset/finalize",
			},
		},
	)

	passwordFinalizeResetHandler := user.NewUserPasswordFinalizeResetHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: passwordFinalizeResetEndpoint,
		Handler:  passwordFinalizeResetHandler,
		Router:   r,
	})

	// POST /api/webhooks/deploy/{token} -> release.NewWebhookHandler
	webhookEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/webhooks/deploy/{token}",
			},
			Scopes: []types.PermissionScope{},
		},
	)

	webhookHandler := release.NewWebhookHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: webhookEndpoint,
		Handler:  webhookHandler,
		Router:   r,
	})

	//  GET /api/integrations/github-app/install
	githubAppInstallEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/integrations/github-app/install",
			},
			Scopes: []types.PermissionScope{},
		},
	)

	githubAppInstallHandler := gitinstallation.NewGithubAppInstallHandler(
		config,
	)

	routes = append(routes, &Route{
		Endpoint: githubAppInstallEndpoint,
		Handler:  githubAppInstallHandler,
		Router:   r,
	})

	//  POST /api/integrations/github-app/webhook
	githubAppWebhookEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/integrations/github-app/webhook",
			},
			Scopes: []types.PermissionScope{},
		},
	)

	githubAppWebhookHandler := gitinstallation.NewGithubAppWebhookHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: githubAppWebhookEndpoint,
		Handler:  githubAppWebhookHandler,
		Router:   r,
	})

	// GET /api/oauth/login/github
	githubLoginStartEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/oauth/login/github",
			},
			Scopes: []types.PermissionScope{},
		},
	)

	githubLoginStartHandler := user.NewUserOAuthGithubHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: githubLoginStartEndpoint,
		Handler:  githubLoginStartHandler,
		Router:   r,
	})

	// GET /api/oauth/github/callback
	githubLoginCallbackEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/oauth/github/callback",
			},
			Scopes: []types.PermissionScope{},
		},
	)

	githubLoginCallbackHandler := user.NewUserOAuthGithubCallbackHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: githubLoginCallbackEndpoint,
		Handler:  githubLoginCallbackHandler,
		Router:   r,
	})

	// GET /api/oauth/login/google
	googleLoginStartEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/oauth/login/google",
			},
			Scopes: []types.PermissionScope{},
		},
	)

	googleLoginStartHandler := user.NewUserOAuthGoogleHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: googleLoginStartEndpoint,
		Handler:  googleLoginStartHandler,
		Router:   r,
	})

	// GET /api/oauth/google/callback
	googleLoginCallbackEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/oauth/google/callback",
			},
			Scopes: []types.PermissionScope{},
		},
	)

	googleLoginCallbackHandler := user.NewUserOAuthGoogleCallbackHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: googleLoginCallbackEndpoint,
		Handler:  googleLoginCallbackHandler,
		Router:   r,
	})

	return routes
}
