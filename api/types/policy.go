package types

type PermissionScope string

const (
	UserScope            PermissionScope = "user"
	ProjectScope         PermissionScope = "project"
	ClusterScope         PermissionScope = "cluster"
	RegistryScope        PermissionScope = "registry"
	InviteScope          PermissionScope = "invite"
	HelmRepoScope        PermissionScope = "helm_repo"
	InfraScope           PermissionScope = "infra"
	OperationScope       PermissionScope = "operation"
	GitInstallationScope PermissionScope = "git_installation"
	NamespaceScope       PermissionScope = "namespace"
	SettingsScope        PermissionScope = "settings"
	ReleaseScope         PermissionScope = "release"
)

type NameOrUInt struct {
	Name string `json:"name"`
	UInt uint   `json:"uint"`
}

type PolicyDocument struct {
	Scope     PermissionScope                     `json:"scope"`
	Resources []NameOrUInt                        `json:"resources"`
	Verbs     []APIVerb                           `json:"verbs"`
	Children  map[PermissionScope]*PolicyDocument `json:"children"`
}

type ScopeTree map[PermissionScope]ScopeTree

/* ScopeHeirarchy describes the tree of scopes, i.e. Cluster, Registry, and Settings
are children of Project, Namespace is a child of Cluster, etc.
*/
var ScopeHeirarchy = ScopeTree{
	ProjectScope: {
		ClusterScope: {
			NamespaceScope: {
				ReleaseScope: {},
			},
		},
		RegistryScope:        {},
		HelmRepoScope:        {},
		GitInstallationScope: {},
		InfraScope: {
			OperationScope: {},
		},
		SettingsScope: {},
	},
}

type Policy []*PolicyDocument

var AdminPolicy = []*PolicyDocument{
	{
		Scope: ProjectScope,
		Verbs: ReadWriteVerbGroup(),
	},
}

var DeveloperPolicy = []*PolicyDocument{
	{
		Scope: ProjectScope,
		Verbs: ReadWriteVerbGroup(),
		Children: map[PermissionScope]*PolicyDocument{
			SettingsScope: {
				Scope: SettingsScope,
				Verbs: ReadVerbGroup(),
			},
		},
	},
}

var ViewerPolicy = []*PolicyDocument{
	{
		Scope: ProjectScope,
		Verbs: ReadVerbGroup(),
		Children: map[PermissionScope]*PolicyDocument{
			SettingsScope: {
				Scope: SettingsScope,
				Verbs: []APIVerb{},
			},
		},
	},
}
