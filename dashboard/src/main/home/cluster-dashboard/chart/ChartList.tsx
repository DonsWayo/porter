import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import api from "shared/api";
import { ChartType, ClusterType, StorageType } from "shared/types";
import { PorterUrl } from "shared/routing";

import Chart from "./Chart";
import Loading from "components/Loading";
import { useWebsockets } from "shared/hooks/useWebsockets";

type Props = {
  currentCluster: ClusterType;
  namespace: string;
  // TODO Convert to enum
  sortType: string;
  currentView: PorterUrl;
};

const ChartList: React.FunctionComponent<Props> = ({
  namespace,
  sortType,
  currentView,
}) => {
  const {
    newWebsocket,
    openWebsocket,
    closeWebsocket,
    closeAllWebsockets,
  } = useWebsockets();
  const [charts, setCharts] = useState<ChartType[]>([]);
  const [controllers, setControllers] = useState<
    Record<string, Record<string, any>>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const context = useContext(Context);

  const updateCharts = async () => {
    try {
      const { currentCluster, currentProject } = context;
      setIsLoading(true);
      const res = await api.getCharts(
        "<token>",
        {
          namespace: namespace,
          cluster_id: currentCluster.id,
          storage: StorageType.Secret,
          limit: 50,
          skip: 0,
          byDate: false,
          statusFilter: [
            "deployed",
            "uninstalled",
            "pending",
            "pending-install",
            "pending-upgrade",
            "pending-rollback",
            "superseded",
            "failed",
          ],
        },
        { id: currentProject.id }
      );
      const charts = res.data || [];
      setIsError(false);
      return charts;
    } catch (error) {
      console.log(error);
      context.setCurrentError(JSON.stringify(error));
      setIsError(true);
    }
  };

  const setupHelmReleasesWebsocket = (
    websocketID: string,
    namespace: string
  ) => {
    let apiPath = `/api/projects/${context.currentProject.id}/k8s/helm_releases?cluster_id=${context.currentCluster.id}`;
    if (namespace) {
      apiPath += `&namespace=${namespace}`;
    }

    const wsConfig = {
      onopen: () => {
        console.log("connected to chart live updates websocket");
      },
      onmessage: (evt: MessageEvent) => {
        let event = JSON.parse(evt.data);
        const newChart: ChartType = event.Object;
        const isSameChart = (chart: ChartType) =>
          chart.name === newChart.name &&
          chart.namespace === newChart.namespace;
        setCharts((currentCharts) => {
          switch (event.event_type) {
            case "ADD":
              if (currentCharts.find(isSameChart)) {
                return currentCharts;
              }
              return currentCharts.concat(newChart);
            case "UPDATE":
              return currentCharts.map((chart) => {
                if (isSameChart(chart) && newChart.version >= chart.version) {
                  return newChart;
                }
                return chart;
              });
            case "DELETE":
              return currentCharts.filter((chart) => !isSameChart(chart));
            default:
              return currentCharts;
          }
        });
      },

      onclose: () => {
        console.log("closing chart live updates websocket");
      },

      onerror: (err: ErrorEvent) => {
        console.log(err);
        closeWebsocket("helm_releases");
      },
    };

    newWebsocket(websocketID, apiPath, wsConfig);
    openWebsocket(websocketID);
  };

  const setupControllerWebsocket = (kind: string) => {
    let { currentCluster, currentProject } = context;
    const apiPath = `/api/projects/${currentProject.id}/k8s/${kind}/status?cluster_id=${currentCluster.id}`;

    const wsConfig = {
      onopen: () => {
        console.log("connected to websocket");
      },
      onmessage: (evt: MessageEvent) => {
        let event = JSON.parse(evt.data);
        let object = event.Object;
        object.metadata.kind = event.Kind;

        setControllers((oldControllers) => ({
          ...oldControllers,
          [object.metadata.uid]: object,
        }));
      },
      onclose: () => {
        console.log("closing websocket");
      },
      onerror: (err: ErrorEvent) => {
        console.log(err);
        closeWebsocket(kind);
      },
    };

    newWebsocket(kind, apiPath, wsConfig);

    openWebsocket(kind);
  };

  const setupControllerWebsockets = (controllers: string[]) => {
    controllers.map((kind) => setupControllerWebsocket(kind));
  };

  useEffect(() => {
    const controllers = [
      "deployment",
      "statefulset",
      "daemonset",
      "replicaset",
    ];

    setupControllerWebsockets(controllers);

    return () => {
      controllers.map((controller) => closeWebsocket(controller));
    };
  }, []);

  useEffect(() => {
    const websocketID = "helm_releases";

    setupHelmReleasesWebsocket(websocketID, namespace);

    return () => {
      closeWebsocket(websocketID);
    };
  }, [namespace]);

  useEffect(() => {
    let isSubscribed = true;

    if (namespace || namespace === "") {
      updateCharts().then((charts) => {
        if (isSubscribed) {
          setCharts(charts);
          setIsLoading(false);
        }
      });
    }
    return () => (isSubscribed = false);
  }, [namespace, currentView]);

  const filteredCharts = useMemo(() => {
    const result = charts.filter((chart: ChartType) => {
      return (
        (currentView == "jobs" && chart.chart.metadata.name == "job") ||
        ((currentView == "applications" ||
          currentView == "cluster-dashboard") &&
          chart.chart.metadata.name != "job")
      );
    });

    if (sortType == "Newest") {
      result.sort((a: any, b: any) =>
        Date.parse(a.info.last_deployed) > Date.parse(b.info.last_deployed)
          ? -1
          : 1
      );
    } else if (sortType == "Oldest") {
      result.sort((a: any, b: any) =>
        Date.parse(a.info.last_deployed) > Date.parse(b.info.last_deployed)
          ? 1
          : -1
      );
    } else if (sortType == "Alphabetical") {
      result.sort((a: any, b: any) => (a.name > b.name ? 1 : -1));
    }

    return result;
  }, [charts, sortType]);

  const renderChartList = () => {
    if (isLoading || (!namespace && namespace !== "")) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    } else if (isError) {
      return (
        <Placeholder>
          <i className="material-icons">error</i> Error connecting to cluster.
        </Placeholder>
      );
    } else if (filteredCharts.length === 0) {
      return (
        <Placeholder>
          <i className="material-icons">category</i> No
          {currentView === "jobs" ? ` jobs` : ` charts`} found in this
          namespace.
        </Placeholder>
      );
    }

    return filteredCharts.map((chart: ChartType, i: number) => {
      return (
        <Chart
          key={`${chart.namespace}-${chart.name}`}
          chart={chart}
          controllers={controllers || {}}
          isJob={currentView === "jobs"}
        />
      );
    });
  };

  return <StyledChartList>{renderChartList()}</StyledChartList>;
};

export default ChartList;

const Placeholder = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ffffff44;
  background: #26282f;
  border-radius: 5px;
  height: 370px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff44;
  font-size: 13px;

  > i {
    font-size: 16px;
    margin-right: 12px;
  }
`;

const LoadingWrapper = styled.div`
  padding-top: 100px;
`;

const StyledChartList = styled.div`
  padding-bottom: 105px;
`;
