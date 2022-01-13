package router

import (
	"fmt"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/cluster"
	"github.com/porter-dev/porter/api/server/handlers/environment"
	"github.com/porter-dev/porter/api/server/handlers/kube_events"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

func NewClusterScopedRegisterer(children ...*Registerer) *Registerer {
	return &Registerer{
		GetRoutes: GetClusterScopedRoutes,
		Children:  children,
	}
}

func GetClusterScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*Registerer,
) []*Route {
	routes, projPath := getClusterRoutes(r, config, basePath, factory)

	if len(children) > 0 {
		r.Route(projPath.RelativePath, func(r chi.Router) {
			for _, child := range children {
				childRoutes := child.GetRoutes(r, config, basePath, factory, child.Children...)

				routes = append(routes, childRoutes...)
			}
		})
	}

	return routes
}

func getClusterRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*Route, *types.Path) {
	relPath := "/clusters/{cluster_id}"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	routes := make([]*Route, 0)

	// POST /api/projects/{project_id}/clusters -> project.NewCreateClusterManualHandler
	createEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/clusters",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	createHandler := cluster.NewCreateClusterManualHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: createEndpoint,
		Handler:  createHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/candidates -> project.NewCreateClusterCandidateHandler
	createCandidateEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/clusters/candidates",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
			CheckUsage:  true,
			UsageMetric: types.Clusters,
		},
	)

	createCandidateHandler := cluster.NewCreateClusterCandidateHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: createCandidateEndpoint,
		Handler:  createCandidateHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/candidates -> project.NewListClusterCandidatesHandler
	listCandidatesEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: "/clusters/candidates",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
		},
	)

	listCandidatesHandler := cluster.NewListClusterCandidatesHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: listCandidatesEndpoint,
		Handler:  listCandidatesHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/candidates/{candidate_id}/resolve -> project.NewResolveClusterCandidateHandler
	resolveCandidateEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent: basePath,
				RelativePath: fmt.Sprintf(
					"/clusters/candidates/{%s}/resolve",
					types.URLParamCandidateID,
				),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
			},
			CheckUsage:  true,
			UsageMetric: types.Clusters,
		},
	)

	resolveCandidateHandler := cluster.NewResolveClusterCandidateHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: resolveCandidateEndpoint,
		Handler:  resolveCandidateHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id} -> project.NewClusterUpdateHandler
	updateClusterEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath,
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	updateClusterHandler := cluster.NewClusterUpdateHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: updateClusterEndpoint,
		Handler:  updateClusterHandler,
		Router:   r,
	})

	// DELETE /api/projects/{project_id}/clusters/{cluster_id} -> project.NewClusterDeleteHandler
	deleteClusterEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbDelete,
			Method: types.HTTPVerbDelete,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath,
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	deleteClusterHandler := cluster.NewClusterDeleteHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: deleteClusterEndpoint,
		Handler:  deleteClusterHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id} -> project.NewClusterGetHandler
	getEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath,
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getHandler := cluster.NewClusterGetHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getEndpoint,
		Handler:  getHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/environments -> environment.NewListEnvironmentHandler
	listEnvEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/environments",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	listEnvHandler := environment.NewListEnvironmentHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: listEnvEndpoint,
		Handler:  listEnvHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/deployments -> environment.NewListDeploymentsByClusterHandler
	listDeploymentsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/deployments",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	listDeploymentsHandler := environment.NewListDeploymentsByClusterHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: listDeploymentsEndpoint,
		Handler:  listDeploymentsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/{environment_id}/deployment -> environment.NewGetDeploymentByClusterHandler
	getDeploymentEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/{environment_id}/deployment",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getDeploymentHandler := environment.NewGetDeploymentByClusterHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getDeploymentEndpoint,
		Handler:  getDeploymentHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/namespaces -> cluster.NewClusterListNamespacesHandler
	listNamespacesEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/namespaces",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	listNamespacesHandler := cluster.NewListNamespacesHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: listNamespacesEndpoint,
		Handler:  listNamespacesHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/nodes -> cluster.NewListNodesHandler
	listNodesEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/nodes",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	listNodesHandler := cluster.NewListNodesHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: listNodesEndpoint,
		Handler:  listNodesHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/nodes/{node_name} -> cluster.NewGetNodeHandler
	getNodeEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/nodes/{%s}", relPath, types.URLParamNodeName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getNodeHandler := cluster.NewGetNodeHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getNodeEndpoint,
		Handler:  getNodeHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/namespaces/create -> cluster.NewCreateNamespaceHandler
	createNamespaceEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/namespaces/create",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	createNamespaceHandler := cluster.NewCreateNamespaceHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: createNamespaceEndpoint,
		Handler:  createNamespaceHandler,
		Router:   r,
	})

	// DELETE /api/projects/{project_id}/clusters/{cluster_id}/namespaces/delete -> cluster.NewDeleteNamespaceHandler
	deleteNamespaceEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbDelete,
			Method: types.HTTPVerbDelete,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/namespaces/delete",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	deleteNamespaceHandler := cluster.NewDeleteNamespaceHandler(
		config,
		factory.GetDecoderValidator(),
	)

	routes = append(routes, &Route{
		Endpoint: deleteNamespaceEndpoint,
		Handler:  deleteNamespaceHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/kubeconfig -> cluster.NewGetTemporaryKubeconfigHandler
	getTemporaryKubeconfigEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/kubeconfig",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getTemporaryKubeconfigHandler := cluster.NewGetTemporaryKubeconfigHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getTemporaryKubeconfigEndpoint,
		Handler:  getTemporaryKubeconfigHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/prometheus/detect -> cluster.NewDetectPrometheusInstalledHandler
	detectPrometheusInstalledEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/prometheus/detect",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	detectPrometheusInstalledHandler := cluster.NewDetectPrometheusInstalledHandler(config)

	routes = append(routes, &Route{
		Endpoint: detectPrometheusInstalledEndpoint,
		Handler:  detectPrometheusInstalledHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/agent/detect -> cluster.NewDetectAgentInstalledHandler
	detectAgentInstalledEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/agent/detect",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	detectAgentInstalledHandler := cluster.NewDetectAgentInstalledHandler(config)

	routes = append(routes, &Route{
		Endpoint: detectAgentInstalledEndpoint,
		Handler:  detectAgentInstalledHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/agent/install -> cluster.NewInstallAgentHandler
	installAgentEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/agent/install",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	installAgentHandler := cluster.NewInstallAgentHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: installAgentEndpoint,
		Handler:  installAgentHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/kube_events -> kube_events.NewGetKubeEventHandler
	listKubeEventsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/kube_events",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	listKubeEventsHandler := kube_events.NewListKubeEventsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: listKubeEventsEndpoint,
		Handler:  listKubeEventsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/kube_events -> kube_events.NewGetKubeEventHandler
	getKubeEventEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/kube_events/{%s}", relPath, types.URLParamKubeEventID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getKubeEventHandler := kube_events.NewGetKubeEventHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getKubeEventEndpoint,
		Handler:  getKubeEventHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/kube_events/{kube_event_id}/logs -> kube_events.NewGetKubeEventLogsHandler
	getKubeEventLogsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/kube_events/{%s}/logs", relPath, types.URLParamKubeEventID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getKubeEventLogsHandler := kube_events.NewGetKubeEventLogsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getKubeEventLogsEndpoint,
		Handler:  getKubeEventLogsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/kube_events/{kube_event_id}/log_buckets -> kube_events.NewGetKubeEventLogBucketsHandler
	getKubeEventLogBucketsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/kube_events/{%s}/log_buckets", relPath, types.URLParamKubeEventID),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getKubeEventLogBucketsHandler := kube_events.NewGetKubeEventLogBucketsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getKubeEventLogBucketsEndpoint,
		Handler:  getKubeEventLogBucketsHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/kube_events -> kube_events.NewCreateKubeEventHandler
	createKubeEventsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/kube_events",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	createKubeEventsHandler := kube_events.NewCreateKubeEventHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: createKubeEventsEndpoint,
		Handler:  createKubeEventsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/prometheus/ingresses -> cluster.NewListNGINXIngressesHandler
	listNGINXIngressesEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/prometheus/ingresses",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	listNGINXIngressesHandler := cluster.NewListNGINXIngressesHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: listNGINXIngressesEndpoint,
		Handler:  listNGINXIngressesHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/metrics -> cluster.NewGetPodMetricsHandler
	getPodMetricsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/metrics",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getPodMetricsHandler := cluster.NewGetPodMetricsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getPodMetricsEndpoint,
		Handler:  getPodMetricsHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/helm_release -> cluster.NewStreamHelmReleaseHandler
	streamHelmReleaseEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/helm_release",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
			IsWebsocket: true,
		},
	)

	streamHelmReleaseHandler := cluster.NewStreamHelmReleaseHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: streamHelmReleaseEndpoint,
		Handler:  streamHelmReleaseHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/{kind}/status -> cluster.NewStreamStatusHandler
	streamStatusEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent: basePath,
				RelativePath: fmt.Sprintf(
					"%s/{%s}/status",
					relPath,
					types.URLParamKind,
				),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
			IsWebsocket: true,
		},
	)

	streamStatusHandler := cluster.NewStreamStatusHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: streamStatusEndpoint,
		Handler:  streamStatusHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/pods -> cluster.NewGetPodsHandler
	getPodsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath + "/pods",
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getPodsHandler := cluster.NewGetPodsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &Route{
		Endpoint: getPodsEndpoint,
		Handler:  getPodsHandler,
		Router:   r,
	})

	return routes, newPath
}
