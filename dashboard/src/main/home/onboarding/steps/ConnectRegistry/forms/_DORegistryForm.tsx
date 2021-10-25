import Helper from "components/form-components/Helper";
import InputRow from "components/form-components/InputRow";
import Loading from "components/Loading";
import SaveButton from "components/SaveButton";
import RegistryImageList from "main/home/onboarding/components/RegistryImageList";
import { OFState } from "main/home/onboarding/state";
import { StateHandler } from "main/home/onboarding/state/StateHandler";
import { DORegistryConfig } from "main/home/onboarding/types";
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router";
import api from "shared/api";
import styled from "styled-components";
import { useSnapshot } from "valtio";

const readableDate = (s: string) => {
  const ts = new Date(s);
  const date = ts.toLocaleDateString();
  const time = ts.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${time} on ${date}`;
};

/**
 * This will redirect to DO, and we should pass the redirection URI to be /onboarding/registry?provider=do
 *
 * After the oauth flow comes back, the first render will go and check if it exists a integration_id for DO in the
 * current onboarding project, after getting it, the CredentialsForm will use nextFormStep to save the onboarding state.
 *
 * If it happens to be an error, it will be shown with the default error handling through the modal.
 */
export const CredentialsForm: React.FC<{
  nextFormStep: (data: Partial<DORegistryConfig>) => void;
  project: any;
}> = ({ nextFormStep, project }) => {
  const snap = useSnapshot(OFState);

  const [isLoading, setIsLoading] = useState(true);
  const [connectedAccount, setConnectedAccount] = useState(null);

  useEffect(() => {
    api.getOAuthIds("<token>", {}, { project_id: project?.id }).then((res) => {
      let integrations = res.data.filter((integration: any) => {
        return integration.client === "do";
      });

      if (Array.isArray(integrations) && integrations.length) {
        // Sort decendant
        integrations.sort((a, b) => b.id - a.id);
        let lastUsed = integrations.find((i) => {
          i.id === snap.StateHandler?.connected_registry?.credentials?.id;
        });
        if (!lastUsed) {
          lastUsed = integrations[0];
        }
        setConnectedAccount(lastUsed);
      }
      setIsLoading(false);
    });
  }, []);

  const submit = (integrationId: number) => {
    nextFormStep({
      credentials: {
        id: integrationId,
      },
    });
  };

  const url = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;

  const encoded_redirect_uri = encodeURIComponent(url);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      {connectedAccount !== null && (
        <div>
          <div>Connected account: {connectedAccount.client}</div>
          <div>Connected at: {readableDate(connectedAccount.created_at)}</div>
        </div>
      )}
      <ConnectDigitalOceanButton
        href={`/api/projects/${project?.id}/oauth/digitalocean?redirect_uri=${encoded_redirect_uri}`}
      >
        {connectedAccount !== null
          ? "Connect another account"
          : "Sign In to Digital Ocean"}
      </ConnectDigitalOceanButton>

      <Br />
      {connectedAccount !== null && (
        <SaveButton
          text="Continue with connected account"
          disabled={false}
          onClick={() => submit(connectedAccount.id)}
          makeFlush={true}
          clearPosition={true}
          status={""}
          statusPosition={"right"}
        />
      )}
    </>
  );
};

export const SettingsForm: React.FC<{
  nextFormStep: (data: Partial<DORegistryConfig>) => void;
  project: any;
}> = ({ nextFormStep, project }) => {
  const [registryUrl, setRegistryUrl] = useState("basic");
  const [registryName, setRegistryName] = useState("");
  const [buttonStatus] = useState("");
  const snap = useSnapshot(OFState);

  const submit = async () => {
    const data = await api
      .connectDORegistry(
        "<token>",
        {
          name: registryName,
          do_integration_id:
            snap.StateHandler.connected_registry.credentials.id,
          url: registryUrl,
        },
        { project_id: project.id }
      )
      .then((res) => res?.data);
    nextFormStep({
      settings: {
        registry_connection_id: data?.id,
        registry_url: registryUrl,
      },
    });
  };

  return (
    <>
      <Helper>
        Provide a name for Porter to use when displaying your registry.
      </Helper>
      <InputRow
        type="text"
        value={registryName}
        setValue={(registryName: string) => setRegistryName(registryName)}
        isRequired={true}
        label="🏷️ Registry Name"
        placeholder="ex: paper-straw"
        width="100%"
      />
      <Helper>
        DOC R URI, in the form{" "}
        <CodeBlock>registry.digitalocean.com/[REGISTRY_NAME]</CodeBlock>. For
        example, <CodeBlock>registry.digitalocean.com/porter-test</CodeBlock>.
      </Helper>
      <InputRow
        type="text"
        value={registryUrl}
        setValue={(url: string) => setRegistryUrl(url)}
        label="🔗 GCR URL"
        placeholder="ex: registry.digitalocean.com/porter-test"
        width="100%"
        isRequired={true}
      />
      <Br />
      <SaveButton
        text="Connect Registry"
        disabled={false}
        onClick={submit}
        makeFlush={true}
        clearPosition={true}
        status={buttonStatus}
        statusPosition={"right"}
      />
    </>
  );
};

export const TestRegistryConnection: React.FC<{
  nextFormStep: () => void;
  project: any;
}> = ({ nextFormStep }) => {
  const snap = useSnapshot(StateHandler);
  return (
    <>
      <RegistryImageList
        registryType="docker"
        project={snap.project}
        registry_id={snap.connected_registry.settings.registry_connection_id}
      />
      <SaveButton
        text="Continue"
        disabled={false}
        onClick={nextFormStep}
        makeFlush={true}
        clearPosition={true}
        status={""}
        statusPosition={"right"}
      />
    </>
  );
};

const Br = styled.div`
  width: 100%;
  height: 15px;
`;

const CodeBlock = styled.span`
  display: inline-block;
  background-color: #1b1d26;
  color: white;
  border-radius: 5px;
  font-family: monospace;
  padding: 2px 3px;
  margin-top: -2px;
  user-select: text;
`;

const ConnectDigitalOceanButton = styled.a`
  width: 200px;
  justify-content: center;
  margin-top: 22px;
  border-radius: 5px;
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  color: white;
  font-weight: 500;
  padding: 10px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  box-shadow: 0 5px 8px 0px #00000010;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#616FEEcc"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "" : "#505edddd"};
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-weight: 600;
    font-size: 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;
