import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import { ResourceType, ChartType } from "shared/types";

import GraphDisplay from "./graph/GraphDisplay";
import Loading from "components/Loading";

type PropsType = {
  components: ResourceType[];
  currentChart: ChartType;
  setSidebar: (x: boolean) => void;
  showRevisions: boolean;
};

type StateType = {
  isExpanded: boolean;
};

export default class GraphSection extends Component<PropsType, StateType> {
  state = {
    isExpanded: false,
  };

  renderContents = () => {
    if (this.props.components && this.props.components.length > 0) {
      return (
        <GraphDisplay
          setSidebar={this.props.setSidebar}
          components={this.props.components}
          isExpanded={this.state.isExpanded}
          currentChart={this.props.currentChart}
          showRevisions={this.props.showRevisions}
        />
      );
    }

    return <Loading offset="-30px" />;
  };

  render() {
    return <StyledGraphSection>{this.renderContents()}</StyledGraphSection>;
  }
}

GraphSection.contextType = Context;

const StyledGraphSection = styled.div`
  width: 100%;
  height: 100%;
  background: #ffffff11;
  font-size: 13px;
  border-radius: 5px;
  overflow: hidden;
`;
