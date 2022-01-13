import DynamicLink from "components/DynamicLink";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import RepoList from "components/repo-selector/RepoList";
import SaveButton from "components/SaveButton";
import DocsHelper from "components/DocsHelper";
import { ActionConfigType } from "shared/types";
import TitleSection from "components/TitleSection";
import { useRouteMatch } from "react-router";
import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import api from "shared/api";
import { Context } from "shared/Context";
import { useRouting } from "shared/routing";

const porterYamlDocsLink =
  "https://docs.porter.run/preview-environments/porter-yaml-reference";

const ConnectNewRepo: React.FC = () => {
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );
  const [repo, setRepo] = useState(null);
  const [status, setStatus] = useState(null);
  const { pushFiltered } = useRouting();

  // NOTE: git_repo_id is a misnomer as this actually refers to the github app's installation id.
  const [actionConfig, setActionConfig] = useState<ActionConfigType>({
    git_repo: null,
    image_repo_uri: null,
    git_branch: null,
    git_repo_id: 0,
  });

  useEffect(() => {}, [repo]);

  const { url } = useRouteMatch();

  const addRepo = () => {
    let [owner, repoName] = repo.split("/");
    setStatus("loading");
    api
      .createEnvironment(
        "<token>",
        {
          name: "Preview",
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          git_installation_id: actionConfig.git_repo_id,
          git_repo_name: repoName,
          git_repo_owner: owner,
        }
      )
      .then(() => {
        setStatus("successful");
        pushFiltered(`${url}`, [], {
          selected_tab: "preview_environments",
        });
      })
      .catch((err) => {
        err = JSON.stringify(err);
        setStatus("error");
        setCurrentError(err);
      });
  };

  return (
    <div>
      <ControlRow>
        <BackButton to={`${url}?selected_tab=preview_environments`}>
          <i className="material-icons">close</i>
        </BackButton>
        <Title>Enable Preview Environments</Title>
      </ControlRow>

      <Heading>Select a Repository</Heading>
      <br />
      <RepoList
        actionConfig={actionConfig}
        setActionConfig={(a: ActionConfigType) => {
          setActionConfig(a);
          setRepo(a.git_repo);
        }}
        readOnly={false}
      />
      <HelperContainer>
        Note: you will need to add a <CodeBlock>porter.yaml</CodeBlock> file to
        create a preview environment.
        <DocsHelper
          tooltipText="A Porter YAML file is a declarative set of resources that Porter uses to build and update your preview environment deployments."
          link="https://docs.porter.run/preview-environments/porter-yaml-reference"
        />
      </HelperContainer>

      <ActionContainer>
        <SaveButton
          text="Add Repository"
          disabled={actionConfig.git_repo_id ? false : true}
          onClick={addRepo}
          makeFlush={true}
          clearPosition={true}
          status={status}
          statusPosition={"left"}
        ></SaveButton>
      </ActionContainer>
    </div>
  );
};

export default ConnectNewRepo;

const ControlRow = styled.div`
  display: flex;
  margin-left: auto;
  align-items: center;
  margin-bottom: 35px;
  padding-left: 0px;
`;

const BackButton = styled(DynamicLink)`
  display: flex;
  width: 37px;
  z-index: 1;
  cursor: pointer;
  height: 37px;
  align-items: center;
  justify-content: center;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  background: #ffffff11;
  color: white;
  > i {
    font-size: 20px;
  }

  :hover {
    background: #ffffff22;
    > img {
      opacity: 1;
    }
  }
`;

const Title = styled(TitleSection)`
  margin-left: 10px;
  margin-bottom: 0;
  font-size: 18px;
`;

const ActionContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 50px;
`;

const CodeBlock = styled.span`
  display: inline-block;
  background-color: #1b1d26;
  color: white;
  border-radius: 8px;
  font-family: monospace;
  padding: 2px 3px;
  user-select: text;
  margin: 0 6px;
`;

const HelperContainer = styled.div`
  margin-top: 24px;
  width: 600px;
  display: flex;
  justify-content: start;
  align-items: center;
  color: #aaaabb;
  line-height: 1.6em;
  font-size: 13px;
`;
