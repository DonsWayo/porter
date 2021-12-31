import React, { Component } from "react";
import styled from "styled-components";
import yaml from "js-yaml";

import backArrow from "assets/back_arrow.png";
import _ from "lodash";
import loading from "assets/loading.gif";

import { ChartType, ClusterType, StorageType } from "shared/types";
import { Context } from "shared/Context";
import api from "shared/api";

import Logs from "./status/Logs";
import TitleSection from "components/TitleSection";
import TempJobList from "./jobs/TempJobList";
import TabRegion from "components/TabRegion";
import SettingsSection from "./SettingsSection";
import PorterFormWrapper from "components/porter-form/PorterFormWrapper";
import { withAuth, WithAuthProps } from "shared/auth/AuthorizationHoc";
import ValuesYaml from "./ValuesYaml";
import DeploymentType from "./DeploymentType";
import Modal from "main/home/modals/Modal";
import UpgradeChartModal from "main/home/modals/UpgradeChartModal";
import { pushFiltered } from "../../../../shared/routing";
import { RouteComponentProps, withRouter } from "react-router";
import Banner from "components/Banner";
import KeyValueArray from "components/form-components/KeyValueArray";

type PropsType = WithAuthProps &
  RouteComponentProps & {
    namespace: string;
    currentChart: ChartType;
    currentCluster: ClusterType;
    closeChart: () => void;
    setSidebar: (x: boolean) => void;
  };

type StateType = {
  currentChart: ChartType;
  imageIsPlaceholder: boolean;
  newestImage: string;
  loading: boolean;
  jobs: any[];
  leftTabOptions: any[];
  rightTabOptions: any[];
  tabContents: any;
  currentTab: string | null;
  websockets: Record<string, any>;
  deleting: boolean;
  saveValuesStatus: string | null;
  formData: any;
  devOpsMode: boolean;
  upgradeVersion: string;
  expandedJobRun: any;
  pods: any;
};

class ExpandedJobChart extends Component<PropsType, StateType> {
  state = {
    currentChart: this.props.currentChart,
    imageIsPlaceholder: false,
    newestImage: null as string,
    loading: true,
    jobs: [] as any[],
    leftTabOptions: [] as any[],
    rightTabOptions: [] as any[],
    tabContents: [] as any,
    currentTab: null as string | null,
    websockets: {} as Record<string, any>,
    deleting: false,
    saveValuesStatus: null as string | null,
    formData: {} as any,
    upgradeVersion: "",
    devOpsMode: localStorage.getItem("devOpsMode") === "true",
    
    expandedJobRun: null as any,
    pods: null as any,
  };

  getPods = (job: any, callback?: () => void) => {
    let { currentCluster, currentProject, setCurrentError } = this.context;

    api
      .getJobPods(
        "<token>",
        {},
        {
          id: currentProject.id,
          name: job.metadata?.name,
          cluster_id: currentCluster.id,
          namespace: job.metadata?.namespace,
        }
      )
      .then((res) => {
        this.setState({ pods: res.data });
        callback();
      })
      .catch((err) => setCurrentError(JSON.stringify(err)));
  };

  // Retrieve full chart data (includes form and values)
  getChartData = (chart: ChartType, revision: number) => {
    let { currentProject } = this.context;
    let { currentCluster, currentChart } = this.props;

    this.setState({ loading: true });
    api
      .getChart(
        "<token>",
        {},
        {
          name: chart.name,
          revision: revision,
          namespace: currentChart.namespace,
          cluster_id: currentCluster.id,
          id: currentProject.id,
        }
      )
      .then((res) => {
        let image = res.data?.config?.image?.repository;
        let tag = res.data?.config?.image?.tag.toString();
        let newestImage = tag ? image + ":" + tag : image;

        if (
          (image === "porterdev/hello-porter-job" ||
            image === "public.ecr.aws/o1j4x7p4/hello-porter-job") &&
          !this.state.newestImage
        ) {
          this.setState(
            {
              currentChart: res.data,
              loading: false,
              imageIsPlaceholder: true,
              newestImage: newestImage,
            },
            () => {
              this.updateTabs();
              this.updateURL();
            }
          );
        } else {
          this.setState(
            {
              currentChart: res.data,
              loading: false,
              newestImage: newestImage,
            },
            () => {
              this.updateTabs();
              this.updateURL();
            }
          );
        }
      })
      .catch(console.log);
  };

  updateURL = () => {
    // updates the url to use the correct revision to ensure refreshes work correctly
    pushFiltered(
      { location: this.props.location, history: this.props.history },
      this.props.match.url,
      ["project_id"],
      {
        chart_revision: this.state.currentChart.version,
      }
    );
  };

  refreshChart = (revision: number) =>
    this.getChartData(this.state.currentChart, revision);

  mergeNewJob = (newJob: any) => {
    let jobs = this.state.jobs;
    let exists = false;
    jobs.forEach((job: any, i: number, self: any[]) => {
      if (
        job.metadata?.name == newJob.metadata?.name &&
        job.metadata?.namespace == newJob.metadata?.namespace
      ) {
        self[i] = newJob;
        exists = true;
      }
    });

    if (!exists) {
      jobs.push(newJob);
    }

    this.sortJobsAndSave(jobs);
  };

  removeJob = (deletedJob: any) => {
    let jobs = this.state.jobs.filter((job) => {
      return deletedJob.metadata?.name !== job.metadata?.name;
    });

    this.sortJobsAndSave(jobs);
  };

  setupJobWebsocket = (chart: ChartType) => {
    let chartVersion = `${chart.chart.metadata.name}-${chart.chart.metadata.version}`;

    let { currentCluster, currentProject } = this.context;
    let protocol = window.location.protocol == "https:" ? "wss" : "ws";
    let ws = new WebSocket(
      `${protocol}://${window.location.host}/api/projects/${currentProject.id}/clusters/${currentCluster.id}/job/status`
    );
    ws.onopen = () => {
      console.log("connected to websocket");
    };

    ws.onmessage = (evt: MessageEvent) => {
      let event = JSON.parse(evt.data);
      let object = event.Object;
      object.metadata.kind = event.Kind;

      // if event type is add or update, merge with existing jobs
      if (event.event_type == "ADD" || event.event_type == "UPDATE") {
        // filter job belonging to chart
        let chartLabel = event.Object?.metadata?.labels["helm.sh/chart"];
        let releaseLabel =
          event.Object?.metadata?.labels["meta.helm.sh/release-name"];

        if (
          chartLabel &&
          releaseLabel &&
          chartLabel == chartVersion &&
          releaseLabel == chart.name
        ) {
          this.mergeNewJob(event.Object);
        }
      } else if (event.event_type == "DELETE") {
        // filter job belonging to chart
        let chartLabel = event.Object?.metadata?.labels["helm.sh/chart"];
        let releaseLabel =
          event.Object?.metadata?.labels["meta.helm.sh/release-name"];

        if (
          chartLabel &&
          releaseLabel &&
          chartLabel == chartVersion &&
          releaseLabel == chart.name
        ) {
          this.removeJob(event.Object);
        }
      }
    };

    ws.onclose = () => {
      console.log("closing websocket");
    };

    ws.onerror = (err: ErrorEvent) => {
      console.log(err);
      ws.close();
    };

    return ws;
  };

  setupCronJobWebsocket = (chart: ChartType) => {
    let releaseName = chart.name;
    let releaseNamespace = chart.namespace;

    let { currentCluster, currentProject } = this.context;
    let protocol = window.location.protocol == "https:" ? "wss" : "ws";
    let ws = new WebSocket(
      `${protocol}://${window.location.host}/api/projects/${currentProject.id}/clusters/${currentCluster.id}/cronjob/status`
    );
    ws.onopen = () => {
      console.log("connected to websocket");
    };

    ws.onmessage = (evt: MessageEvent) => {
      let event = JSON.parse(evt.data);
      let object = event.Object;
      object.metadata.kind = event.Kind;

      // if imageIsPlaceholder is true, update the newestImage and imageIsPlaceholder fields
      if (
        (event.event_type == "ADD" || event.event_type == "UPDATE") &&
        this.state.imageIsPlaceholder
      ) {
        // filter job belonging to chart
        let relNameAnn =
          event.Object?.metadata?.annotations["meta.helm.sh/release-name"];
        let relNamespaceAnn =
          event.Object?.metadata?.annotations["meta.helm.sh/release-namespace"];

        if (
          relNameAnn &&
          relNamespaceAnn &&
          releaseName == relNameAnn &&
          releaseNamespace == relNamespaceAnn
        ) {
          let newestImage =
            event.Object?.spec?.jobTemplate?.spec?.template?.spec?.containers[0]
              ?.image;
          if (
            newestImage &&
            newestImage !== "porterdev/hello-porter-job" &&
            newestImage !== "porterdev/hello-porter-job:latest" &&
            newestImage !== "public.ecr.aws/o1j4x7p4/hello-porter-job" &&
            newestImage !== "public.ecr.aws/o1j4x7p4/hello-porter-job:latest"
          ) {
            this.setState({ newestImage, imageIsPlaceholder: false });
          }
        }
      }
    };

    ws.onclose = () => {
      console.log("closing websocket");
    };

    ws.onerror = (err: ErrorEvent) => {
      console.log(err);
      ws.close();
    };

    return ws;
  };

  handleSaveValues = (config?: any, runJob?: boolean) => {
    let { currentCluster, setCurrentError, currentProject } = this.context;
    this.setState({ saveValuesStatus: "loading" });

    let conf: string;

    if (!config) {
      let values = {};
      let imageUrl = this.state.newestImage;
      let tag = null;

      if (imageUrl) {
        if (imageUrl.includes(":")) {
          let splits = imageUrl.split(":");
          imageUrl = splits[0];
          tag = splits[1].toString();
        } else if (!tag) {
          tag = "latest";
        }

        _.set(values, "image.repository", imageUrl);
        _.set(values, "image.tag", tag);
      }

      conf = yaml.dump({
        ...this.state.currentChart.config,
        ...values,
      });
    } else {
      // Convert dotted keys to nested objects
      let values = {};

      for (let key in config) {
        _.set(values, key, config[key]);
      }

      let imageUrl = this.state.newestImage;
      let tag = null as string;

      if (imageUrl) {
        if (imageUrl.includes(":")) {
          let splits = imageUrl.split(":");
          imageUrl = splits[0];
          tag = splits[1].toString();
        } else if (!tag) {
          tag = "latest";
        }

        _.set(values, "image.repository", imageUrl);
        _.set(values, "image.tag", `${tag}`);
      }

      if (runJob) {
        _.set(values, "paused", false);
      } else {
        _.set(values, "paused", true);
      }

      // Weave in preexisting values and convert to yaml
      conf = yaml.dump(
        {
          ...(this.state.currentChart.config as Object),
          ...values,
        },
        { forceQuotes: true }
      );
    }

    api
      .upgradeChartValues(
        "<token>",
        {
          values: conf,
        },
        {
          id: currentProject.id,
          name: this.state.currentChart.name,
          namespace: this.state.currentChart.namespace,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {
        this.setState({ saveValuesStatus: "successful" });
        this.refreshChart(0);
      })
      .catch((err) => {
        let parsedErr = err?.response?.data?.error;

        if (parsedErr) {
          err = parsedErr;
        }

        this.setState({
          saveValuesStatus: parsedErr,
        });

        setCurrentError(parsedErr);
      });
  };

  toggleDevOpsMode = () => {
    this.setState((prevState) => ({
      devOpsMode: !prevState.devOpsMode,
    }));
  };

  getJobs = async (chart: ChartType) => {
    let { currentCluster, currentProject, setCurrentError } = this.context;

    api
      .getJobs(
        "<token>",
        {},
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace: chart.namespace,
          release_name: chart.name,
        }
      )
      .then((res) => {
        // sort jobs by started timestamp
        this.sortJobsAndSave(res.data);
      })
      .catch((err) => setCurrentError(err));
  };

  sortJobsAndSave = (jobs: any[]) => {

    // Set job run from URL if needed
    const urlParams = new URLSearchParams(location.search);
    const urlJob = urlParams.get("job");

    jobs.sort((job1, job2) => {
      if (job1.metadata.name === urlJob) {
        this.setJobRun(job1);
      } else if (job2.metadata.name === urlJob) {
        this.setJobRun(job2);
      }

      let date1: Date = new Date(job1.status?.startTime);
      let date2: Date = new Date(job2.status?.startTime);

      return date2.getTime() - date1.getTime();
    });
    let newestImage = jobs[0]?.spec?.template?.spec?.containers[0]?.image;
    if (
      newestImage &&
      newestImage !== "porterdev/hello-porter-job" &&
      newestImage !== "porterdev/hello-porter-job:latest" &&
      newestImage !== "public.ecr.aws/o1j4x7p4/hello-porter-job" &&
      newestImage !== "public.ecr.aws/o1j4x7p4/hello-porter-job:latest"
    ) {
      this.setState({ jobs, newestImage, imageIsPlaceholder: false });
    } else {
      this.setState({ jobs });
    }
  };

  setJobRun = (job: any) => {
    this.getPods(job, () => {
      this.setState({ expandedJobRun: job, currentTab: "logs" });
    });
  }

  renderTabContents = (currentTab: string, submitValues?: any) => {
    switch (currentTab) {
      case "jobs":
        if (this.state.imageIsPlaceholder) {
          return (
            <Placeholder>
              <TextWrap>
                <Header>
                  <Spinner src={loading} /> This job is currently being deployed
                </Header>
                Navigate to the
                <A
                  href={`https://github.com/${this.props.currentChart?.git_action_config?.git_repo}/actions`}
                  target={"_blank"}
                >
                  Actions tab
                </A>{" "}
                of your GitHub repo to view live build logs.
              </TextWrap>
            </Placeholder>
          );
        }
        return (
          <TabWrapper>
            <TempJobList
              handleSaveValues={this.handleSaveValues}
              jobs={this.state.jobs}
              setJobs={(jobs: any) => this.setState({ jobs })}
              isAuthorized={this.props.isAuthorized}
              saveValuesStatus={this.state.saveValuesStatus}

              expandJob={(job: any) => this.setJobRun(job)}
            />
          </TabWrapper>
        );
      case "values":
        return (
          <ValuesYaml
            currentChart={this.state.currentChart}
            refreshChart={() => this.refreshChart(0)}
            disabled={!this.props.isAuthorized("job", "", ["get", "update"])}
          />
        );
      case "settings":
        return (
          this.props.isAuthorized("job", "", ["get", "delete"]) && (
            <SettingsSection
              currentChart={this.state.currentChart}
              refreshChart={() => this.refreshChart(0)}
              setShowDeleteOverlay={(x: boolean) => {
                let { setCurrentOverlay } = this.context;
                if (x) {
                  setCurrentOverlay({
                    message: `Are you sure you want to delete ${this.state.currentChart.name}?`,
                    onYes: this.handleUninstallChart,
                    onNo: () => setCurrentOverlay(null),
                  });
                } else {
                  setCurrentOverlay(null);
                }
              }}
              saveButtonText="Save Config"
            />
          )
        );
      default:
    }
  };

  updateTabs() {
    let formData = this.state.currentChart.form;
    if (formData) {
      this.setState({
        formData,
      });
    }
    let rightTabOptions = [] as any[];

    if (this.state.devOpsMode) {
      rightTabOptions.push({ label: "Helm Values", value: "values" });
    }

    if (this.props.isAuthorized("job", "", ["get", "delete"])) {
      rightTabOptions.push({ label: "Settings", value: "settings" });
    }

    // Filter tabs if previewing an old revision
    this.setState({
      leftTabOptions: [{ label: "Jobs", value: "jobs" }],
      rightTabOptions,
    });
  }

  readableDate = (s: string) => {
    let ts = new Date(s);
    let date = ts.toLocaleDateString();
    let time = ts.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${time} on ${date}`;
  };

  componentDidMount() {
    let { currentChart } = this.state;

    window.analytics.track("Opened Chart", {
      chart: currentChart.name,
    });

    this.getChartData(currentChart, currentChart.version);
    this.getJobs(currentChart);
    this.setupJobWebsocket(currentChart);
    this.setupCronJobWebsocket(currentChart);
  }

  componentDidUpdate(
    prevProps: Readonly<PropsType>,
    prevState: Readonly<StateType>
  ) {
    const { devOpsMode } = this.state;

    if (devOpsMode !== prevState.devOpsMode) {
      this.updateTabs();
      localStorage.setItem("devOpsMode", devOpsMode.toString());
    }
  }

  handleUninstallChart = () => {
    let { currentProject, currentCluster, setCurrentOverlay } = this.context;
    let { currentChart } = this.state;
    this.setState({ deleting: true });
    setCurrentOverlay(null);
    api
      .uninstallTemplate(
        "<token>",
        {},
        {
          namespace: currentChart.namespace,
          name: currentChart.name,
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {
        this.props.closeChart();
      })
      .catch(console.log);
  };

  handleUpgradeVersion = async (version: string, cb: () => void) => {
    // convert current values to yaml
    let values = this.state.currentChart.config;

    let valuesYaml = yaml.dump({
      ...(this.state.currentChart.config as Object),
      ...values,
    });

    _.set(values, "paused", true);

    const { currentChart } = this.state;
    this.setState({ saveValuesStatus: "loading" });
    this.getChartData(currentChart, currentChart.version);

    try {
      await api.upgradeChartValues(
        "<token>",
        {
          values: valuesYaml,
          version: version,
        },
        {
          id: this.context.currentProject.id,
          name: currentChart.name,
          namespace: currentChart.namespace,
          cluster_id: this.context.currentCluster.id,
        }
      );
      this.setState({ saveValuesStatus: "successful" });

      window.analytics.track("Chart Upgraded", {
        chart: currentChart.name,
        values: valuesYaml,
      });

      cb && cb();
    } catch (err) {
      let parsedErr = err?.response?.data?.error;

      if (parsedErr) {
        err = parsedErr;
      }
      this.setState({ saveValuesStatus: err });
      this.context.setCurrentError(parsedErr);

      window.analytics.track("Failed to Upgrade Chart", {
        chart: currentChart.name,
        values: valuesYaml,
        error: err,
      });
    }
  };

  renderExpandedChart() {
    let { closeChart } = this.props;
    let { currentChart } = this.state;
    let chart = currentChart;
    const displayUpdateButton =
      chart.latest_version &&
      chart.latest_version !== chart.chart.metadata.version;
    return (
      <>
        {this.state.upgradeVersion && (
          <Modal
            onRequestClose={() => this.setState({ upgradeVersion: "" })}
            width="500px"
            height="450px"
          >
            <UpgradeChartModal
              currentChart={chart}
              closeModal={() => {
                this.setState({ upgradeVersion: "" });
              }}
              onSubmit={() => {
                this.handleUpgradeVersion(this.state.upgradeVersion, () => {
                  this.setState({ loading: false });
                });
                this.setState({ upgradeVersion: "", loading: true });
              }}
            />
          </Modal>
        )}
        <StyledExpandedChart>
          <HeaderWrapper>
            <BackButton onClick={closeChart}>
              <BackButtonImg src={backArrow} />
            </BackButton>
            <TitleSection
              icon={currentChart.chart.metadata.icon}
              iconWidth="33px"
            >
              {chart.name}
              <DeploymentType currentChart={currentChart} />
              <TagWrapper>
                Namespace <NamespaceTag>{chart.namespace}</NamespaceTag>
              </TagWrapper>
            </TitleSection>

            <InfoWrapper>
              <LastDeployed>
                Run {this.state.jobs.length} times <Dot>•</Dot>Last template
                update at
                {" " + this.readableDate(chart.info.last_deployed)}
              </LastDeployed>
            </InfoWrapper>
            {displayUpdateButton && (
              <>
                <Br />
                <Banner>
                  A template update is available.
                  <Link onClick={(e) => {
                    e.stopPropagation();
                    this.setState({
                      upgradeVersion: currentChart.latest_version,
                    });
                  }}>
                    View upgrade notes
                  </Link>
                </Banner>
                <Br /><Br /><Br /><Br /><Br /><Br />
              </>
            )}
          </HeaderWrapper>

          {this.state.deleting ? (
            <>
              <LineBreak />
              <Placeholder>
                <TextWrap>
                  <Header>
                    <Spinner src={loading} /> Deleting "{currentChart.name}"
                  </Header>
                  You will be automatically redirected after deletion is
                  complete.
                </TextWrap>
              </Placeholder>
            </>
          ) : (
            <BodyWrapper>
              {(this.state.leftTabOptions?.length > 0 ||
                this.state.formData.tabs?.length > 0 ||
                this.state.rightTabOptions?.length > 0) && (
                <PorterFormWrapper
                  formData={this.state.formData}
                  valuesToOverride={{
                    namespace: chart.namespace,
                    clusterId: this.props.currentCluster.id,
                  }}
                  renderTabContents={this.renderTabContents}
                  isReadOnly={
                    this.state.imageIsPlaceholder ||
                    !this.props.isAuthorized("job", "", ["get", "update"])
                  }
                  onSubmit={(formValues) =>
                    this.handleSaveValues(formValues, false)
                  }
                  leftTabOptions={this.state.leftTabOptions}
                  rightTabOptions={this.state.rightTabOptions}
                  saveValuesStatus={this.state.saveValuesStatus}
                  saveButtonText="Save Config"
                  includeHiddenFields
                  addendum={
                    <TabButton
                      onClick={this.toggleDevOpsMode}
                      devOpsMode={this.state.devOpsMode}
                    >
                      <i className="material-icons">offline_bolt</i> DevOps Mode
                    </TabButton>
                  }
                />
              )}
            </BodyWrapper>
          )}
        </StyledExpandedChart>
      </>
    );
  }

  renderStatus = (job: any, time: string) => {
    if (job.status?.succeeded >= 1) {
      return <Status color="#38a88a">Succeeded {time}</Status>;
    }

    if (job.status?.failed >= 1) {
      return (
        <Status color="#cc3d42">Failed {time}
          {
            job.status.conditions.length > 0 && `: ${job.status.conditions[0].reason}`
          }
        </Status>
      );
    }

    return <Status color="#ffffff11">Running</Status>;
  };

  renderConfigSection = (job: any) => {
    let commandString = job?.spec?.template?.spec?.containers[0]?.command?.join(
      " "
    );
    let envArray = job?.spec?.template?.spec?.containers[0]?.env;
    let envObject = {} as any;
    envArray &&
      envArray.forEach((env: any, i: number) => {
        const secretName = _.get(env, "valueFrom.secretKeyRef.name");
        envObject[env.name] = secretName
          ? `PORTERSECRET_${secretName}`
          : env.value;
      });

    // Handle no config to show
    if (!commandString && _.isEmpty(envObject)) {
      return <Placeholder>No config was found.</Placeholder>;
    }

    let tag = job.spec.template.spec.containers[0].image.split(":")[1];
    return (
      <ConfigSection>
        {commandString ? (
          <>
            Command: <Command>{commandString}</Command>
          </>
        ) : (
          <DarkMatter size="-18px" />
        )}
        <Row>
          Image Tag: <Command>{tag}</Command>
        </Row>
        {!_.isEmpty(envObject) && (
          <>
            <KeyValueArray
              envLoader={true}
              values={envObject}
              label="Environment Variables:"
              disabled={true}
            />
            <DarkMatter />
          </>
        )}
      </ConfigSection>
    );
  };

  renderExpandedJobRun() {
    let { currentChart } = this.state;
    let chart = currentChart;
    let run = this.state.expandedJobRun;

    return (
      <StyledExpandedChart>
        <HeaderWrapper>
          <BackButton onClick={() => this.setState({ expandedJobRun: null })}>
            <BackButtonImg src={backArrow} />
          </BackButton>
          <TitleSection
            icon={currentChart.chart.metadata.icon}
            iconWidth="33px"
          >
            {chart.name} <Gray>at {this.readableDate(run.status.startTime)}</Gray>
          </TitleSection>

          <InfoWrapper>
            <LastDeployed>
              {this.renderStatus(run, run.status.completionTime ? this.readableDate(run.status.completionTime) : "")}
              <TagWrapper>
                Namespace <NamespaceTag>{chart.namespace}</NamespaceTag>
              </TagWrapper>
              <DeploymentType currentChart={currentChart} />
            </LastDeployed>
          </InfoWrapper>
        </HeaderWrapper>
        <BodyWrapper>
          <TabRegion
            currentTab={this.state.currentTab}
            setCurrentTab={(x: string) => this.setState({ currentTab: x })}
            options={[
              {
                label: "Logs", value: "logs",
              },
              {
                label: "Config", value: "config",
              }
            ]}
          >
            {
              this.state.currentTab === "logs" ? (
                <JobLogsWrapper>
                  <Logs
                    selectedPod={this.state.pods[0]}
                    podError={!this.state.pods[0] ? "Pod no longer exists." : ""}
                    rawText={true}
                  />
                </JobLogsWrapper>
              ) : (
                <>{this.renderConfigSection(run)}</>
              )
            }
          </TabRegion>
        </BodyWrapper>
      </StyledExpandedChart>
    );
  }

  render() {
    return (
      <>
        { 
          !this.state.expandedJobRun ? (
            <>{this.renderExpandedChart()}</>
          ) : (
            <>{this.renderExpandedJobRun()}</>
          )
        }
      </>
    );
  }
}

ExpandedJobChart.contextType = Context;

export default withRouter(withAuth(ExpandedJobChart));

const Row = styled.div`
  margin-top: 20px;
`;

const DarkMatter = styled.div<{ size?: string }>`
  width: 100%;
  margin-bottom: ${(props) => props.size || "-13px"};
`;

const Command = styled.span`
  font-family: monospace;
  color: #aaaabb;
  margin-left: 7px;
`;

const ConfigSection = styled.div`
  padding: 20px 30px 30px;
  font-size: 13px;
  font-weight: 500;
  width: 100%;
  border-radius: 8px;
  background: #ffffff08;
`;

const JobLogsWrapper = styled.div`
  min-height: 450px;
  height: 55vh;
  width: 100%;
  border-radius: 8px;
  background-color: black;
  overflow-y: auto;
`;

const Div = styled.div`
  width: 100%;
  height: 100%;
  background: red;
`;

const Status = styled.div<{ color: string }>`
  padding: 5px 10px;
  background: ${(props) => props.color};
  font-size: 13px;
  border-radius: 3px;
  height: 25px;
  color: #ffffff;
  margin-bottom: -3px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Gray = styled.div`
  color: #ffffff44;
  margin-left: 15px;
  font-weight: 400;
  font-size: 18px;
`;

const Br = styled.div`
  width: 100%;
  height: 2px;
`;

const Link = styled.div`
  cursor: pointer;
  margin-left: 5px;
  color: #8590ff;
`;

const RevisionUpdateMessage = styled.button`
  background: none;
  color: white;
  display: flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 5px;
  border: none;
  margin-bottom: 14px;

  :hover {
    border: 1px solid white;
    padding: 3px 9px;
    cursor: pointer;
  }

  > i {
    margin-right: 6px;
    font-size: 20px;
    cursor: pointer;
    border-radius: 20px;
    transform: none;
  }
`;

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 2px;
  background: #ffffff20;
  margin: 15px 0px 55px;
`;

const ButtonWrapper = styled.div`
  margin: 5px 0 35px;
`;

const BackButton = styled.div`
  position: absolute;
  top: 0px;
  right: 0px;
  display: flex;
  width: 36px;
  cursor: pointer;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
    > img {
      opacity: 1;
    }
  }
`;

const BackButtonImg = styled.img`
  width: 16px;
  opacity: 0.75;
`;

const TextWrap = styled.div``;

const Header = styled.div`
  font-weight: 500;
  color: #aaaabb;
  font-size: 16px;
  margin-bottom: 15px;
`;

const Placeholder = styled.div`
  min-height: 400px;
  height: 50vh;
  padding: 30px;
  padding-bottom: 70px;
  font-size: 13px;
  color: #ffffff44;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Spinner = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 12px;
  margin-bottom: -2px;
`;

const BodyWrapper = styled.div`
  position: relative;
  overflow: hidden;
`;

const TabWrapper = styled.div`
  height: 100%;
  width: 100%;
  padding-bottom: 47px;
  overflow: hidden;
`;

const HeaderWrapper = styled.div`
  position: relative;
`;

const Dot = styled.div`
  margin-right: 9px;
  margin-left: 9px;
`;

const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  margin: 24px 0px 17px 0px;
  height: 20px;
`;

const LastDeployed = styled.div`
  font-size: 13px;
  margin-left: 0;
  margin-top: -1px;
  display: flex;
  align-items: center;
  color: #aaaabb66;
`;

const TagWrapper = styled.div`
  height: 25px;
  font-size: 12px;
  display: flex;
  margin-left: 20px;
  margin-bottom: -3px;
  align-items: center;
  font-weight: 400;
  justify-content: center;
  color: #ffffff44;
  border: 1px solid #ffffff44;
  border-radius: 3px;
  padding-left: 5px;
  background: #26282e;
`;

const NamespaceTag = styled.div`
  height: 100%;
  margin-left: 6px;
  color: #aaaabb;
  background: #43454a;
  border-radius: 3px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0px 6px;
  padding-left: 7px;
  border-top-left-radius: 0px;
  border-bottom-left-radius: 0px;
`;

const Icon = styled.img`
  width: 100%;
`;

const IconWrapper = styled.div`
  color: #efefef;
  font-size: 16px;
  height: 20px;
  width: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 3px;
  margin-right: 12px;

  > i {
    font-size: 20px;
  }
`;

const StyledExpandedChart = styled.div`
  width: 100%;
  z-index: 0;
  animation: fadeIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  display: flex;
  overflow-y: auto;
  padding-bottom: 120px;
  flex-direction: column;
  overflow: visible;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const TabButton = styled.div`
  position: absolute;
  right: 0px;
  height: 30px;
  background: linear-gradient(to right, #20222700, #202227 20%);
  padding-left: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: ${(props: { devOpsMode: boolean }) =>
    props.devOpsMode ? "#aaaabb" : "#aaaabb55"};
  margin-left: 35px;
  border-radius: 20px;
  text-shadow: 0px 0px 8px
    ${(props: { devOpsMode: boolean }) =>
      props.devOpsMode ? "#ffffff66" : "none"};
  cursor: pointer;
  :hover {
    color: ${(props: { devOpsMode: boolean }) =>
      props.devOpsMode ? "" : "#aaaabb99"};
  }

  > i {
    font-size: 17px;
    margin-right: 9px;
  }
`;

const A = styled.a`
  color: #8590ff;
  text-decoration: underline;
  margin-left: 5px;
  cursor: pointer;
`;
