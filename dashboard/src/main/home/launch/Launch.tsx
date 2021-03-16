import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import api from "shared/api";
import { PorterTemplate } from "shared/types";

import TabSelector from "components/TabSelector";
import ExpandedTemplate from "./expanded-template/ExpandedTemplate";
import Loading from "components/Loading";

import hardcodedNames from "./hardcodedNameDict";
import { Link } from "react-router-dom";

const tabOptions = [
  { label: "New Application", value: "docker" },
  { label: "Community Add-ons", value: "community" },
];

type PropsType = {};

type StateType = {
  currentTemplate: PorterTemplate | null;
  currentTab: string;
  porterTemplates: PorterTemplate[];
  loading: boolean;
  error: boolean;
};

export default class Templates extends Component<PropsType, StateType> {
  state = {
    currentTemplate: null as PorterTemplate | null,
    currentTab: "docker",
    porterTemplates: [] as PorterTemplate[],
    loading: true,
    error: false,
  };

  componentDidMount() {
    api
      .getTemplates("<token>", {}, {})
      .then((res) => {
        this.setState({ porterTemplates: res.data, error: false }, () => {
          this.state.porterTemplates.sort((a, b) => (a.name > b.name ? 1 : -1));
          this.state.porterTemplates.sort((a, b) =>
            a.name === "docker" ? -1 : b.name === "docker" ? 1 : 0
          );
          // TODO: properly find "docker" template instead of relying on first entry
          this.setState({
            loading: false,
            currentTemplate: this.state.porterTemplates[0],
          });
        });
      })
      .catch(() => this.setState({ loading: false, error: true }));
  }

  renderIcon = (icon: string) => {
    if (icon) {
      return <Icon src={icon} />;
    }

    return (
      <Polymer>
        <i className="material-icons">layers</i>
      </Polymer>
    );
  };

  renderTemplateList = () => {
    let { loading, error, porterTemplates } = this.state;

    if (loading) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    } else if (error) {
      return (
        <Placeholder>
          <i className="material-icons">error</i> Error retrieving templates.
        </Placeholder>
      );
    } else if (porterTemplates.length === 0) {
      return (
        <Placeholder>
          <i className="material-icons">category</i> No templates found.
        </Placeholder>
      );
    }

    return this.state.porterTemplates
      .filter((t) => t.name.toLowerCase() !== "docker")
      .map((template: PorterTemplate, i: number) => {
        let { name, icon, description } = template;
        if (hardcodedNames[name]) {
          name = hardcodedNames[name];
        }
        return (
          <TemplateBlock
            key={i}
            onClick={() => this.setState({ currentTemplate: template })}
          >
            {this.renderIcon(icon)}
            <TemplateTitle>{name}</TemplateTitle>
            <TemplateDescription>{description}</TemplateDescription>
          </TemplateBlock>
        );
      });
  };

  renderDefaultTemplate = () => {
    if (!this.context.currentCluster) {
      return (
        <>
          <Banner>
            <i className="material-icons">error_outline</i>
            <Link to="dashboard">Provision</Link> &nbsp;or&nbsp;
            <Link
              to="#"
              onClick={() =>
                this.context.setCurrentModal("ClusterInstructionsModal")
              }
            >
              connect
            </Link>
            &nbsp;to a cluster
          </Banner>
        </>
      );
    }
    if (this.state.currentTemplate) {
      return (
        <ExpandedTemplate
          currentTemplate={this.state.porterTemplates[0]}
          setCurrentTemplate={(currentTemplate: PorterTemplate) =>
            this.setState({ currentTemplate })
          }
          skipDescription={true}
        />
      );
    }
    return null;
  };

  renderCommunityTemplates = () => {
    if (this.state.currentTemplate) {
      return (
        <ExpandedTemplate
          currentTemplate={this.state.currentTemplate}
          setCurrentTemplate={(currentTemplate: PorterTemplate) =>
            this.setState({ currentTemplate })
          }
        />
      );
    }
    return <TemplateList>{this.renderTemplateList()}</TemplateList>;
  };

  render() {
    return (
      <TemplatesWrapper>
        <TitleSection>
          <Title>Launch</Title>
          <a
            href="https://docs.getporter.dev/docs/porter-templates"
            target="_blank"
          >
            <i className="material-icons">help_outline</i>
          </a>
        </TitleSection>
        <TabSelector
          options={tabOptions}
          currentTab={this.state.currentTab}
          setCurrentTab={(value: string) =>
            this.setState({
              currentTab: value,
              currentTemplate:
                value === "docker" ? this.state.porterTemplates[0] : null,
            })
          }
        />
        {this.state.currentTab === "docker"
          ? this.renderDefaultTemplate()
          : this.renderCommunityTemplates()}
      </TemplatesWrapper>
    );
  }
}

Templates.contextType = Context;

const Placeholder = styled.div`
  padding-top: 200px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ffffff44;
  font-size: 14px;

  > i {
    font-size: 18px;
    margin-right: 12px;
  }
`;

const Banner = styled.div`
  height: 40px;
  width: 100%;
  margin: 30px 0 30px;
  font-size: 13px;
  display: flex;
  border-radius: 5px;
  padding-left: 15px;
  align-items: center;
  background: #ffffff11;
  > i {
    margin-right: 10px;
    font-size: 18px;
  }
`;

const LoadingWrapper = styled.div`
  padding-top: 300px;
`;

const Icon = styled.img`
  height: 42px;
  margin-top: 35px;
  margin-bottom: 13px;
`;

const Polymer = styled.div`
  > i {
    font-size: 34px;
    margin-top: 38px;
    margin-bottom: 20px;
  }
`;

const TemplateDescription = styled.div`
  margin-bottom: 26px;
  color: #ffffff66;
  text-align: center;
  font-weight: default;
  padding: 0px 25px;
  height: 2.4em;
  font-size: 12px;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const TemplateTitle = styled.div`
  margin-bottom: 12px;
  width: 80%;
  text-align: center;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TemplateBlock = styled.div`
  border: 1px solid #ffffff00;
  align-items: center;
  user-select: none;
  border-radius: 5px;
  display: flex;
  font-size: 13px;
  font-weight: 500;
  padding: 3px 0px 5px;
  flex-direction: column;
  align-item: center;
  justify-content: space-between;
  height: 200px;
  cursor: pointer;
  color: #ffffff;
  position: relative;
  background: #26282f;
  box-shadow: 0 5px 8px 0px #00000033;
  :hover {
    background: #ffffff11;
  }

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const TemplateList = styled.div`
  overflow-y: auto;
  margin-top: 35px;
  padding-bottom: 150px;
  display: grid;
  grid-column-gap: 25px;
  grid-row-gap: 25px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;

const Title = styled.div`
  font-size: 24px;
  font-weight: 600;
  font-family: "Work Sans", sans-serif;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TitleSection = styled.div`
  margin-bottom: 20px;
  display: flex;
  flex-direction: row;
  align-items: center;

  > a {
    > i {
      display: flex;
      align-items: center;
      margin-bottom: -2px;
      font-size: 18px;
      margin-left: 18px;
      color: #858faaaa;
      :hover {
        color: #aaaabb;
      }
    }
  }
`;

const TemplatesWrapper = styled.div`
  width: calc(90% - 130px);
  min-width: 300px;
  padding-top: 75px;
`;
