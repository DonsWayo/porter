import Helper from "components/form-components/Helper";
import InputRow from "components/form-components/InputRow";
import UploadArea from "components/form-components/UploadArea";
import SaveButton from "components/SaveButton";
import RegistryImageList from "main/home/onboarding/components/RegistryImageList";
import { OFState } from "main/home/onboarding/state";
import { StateHandler } from "main/home/onboarding/state/StateHandler";
import { GCPRegistryConfig } from "main/home/onboarding/types";
import React, { useState } from "react";
import api from "shared/api";
import styled from "styled-components";
import { useSnapshot } from "valtio";

export const CredentialsForm: React.FC<{
  nextFormStep: (data: Partial<GCPRegistryConfig>) => void;
  project: any;
}> = ({ nextFormStep, project }) => {
  const [projectId, setProjectId] = useState("");
  const [serviceAccountKey, setServiceAccountKey] = useState("");
  const [buttonStatus, setButtonStatus] = useState("");

  const validate = () => {
    if (!projectId) {
      return { hasError: true, error: "Project ID cannot be empty" };
    }

    if (!serviceAccountKey) {
      return { hasError: true, error: "GCP Key Data cannot be empty" };
    }
    return {
      hasError: false,
      error: "",
    };
  };

  const submit = async () => {
    const validation = validate();

    if (validation.hasError) {
      setButtonStatus(validation.error);
      return;
    }
    setButtonStatus("loading");
    try {
      const gcpIntegration = await api
        .createGCPIntegration(
          "<token>",
          {
            gcp_key_data: serviceAccountKey,
            gcp_project_id: projectId,
          },
          { project_id: project.id }
        )
        .then((res) => res.data);

      nextFormStep({
        credentials: {
          id: gcpIntegration?.id,
        },
      });
    } catch (error) {
      setButtonStatus("Something went wrong, please try again");
    }
  };

  return (
    <>
      <InputRow
        type="text"
        value={projectId}
        setValue={(x: string) => {
          setProjectId(x);
        }}
        label="🏷️ GCP Project ID"
        placeholder="ex: blindfold-ceiling-24601"
        width="100%"
        isRequired={true}
      />

      <Helper>Service account credentials for GCP permissions.</Helper>
      <UploadArea
        setValue={(x: any) => setServiceAccountKey(x)}
        label="🔒 GCP Key Data (JSON)"
        placeholder="Choose a file or drag it here."
        width="100%"
        height="100%"
        isRequired={true}
      />
      <Br />
      <SaveButton
        text="Continue"
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

export const SettingsForm: React.FC<{
  nextFormStep: (data: Partial<GCPRegistryConfig>) => void;
  project: any;
}> = ({ nextFormStep, project }) => {
  const [registryName, setRegistryName] = useState("");
  const [registryUrl, setRegistryUrl] = useState("");
  const [buttonStatus, setButtonStatus] = useState("");
  const snap = useSnapshot(OFState);

  const validate = () => {
    if (!registryName) {
      return {
        hasError: true,
        error: "Registry Name cannot be empty",
      };
    }
    if (!registryUrl) {
      return {
        hasError: true,
        error: "Registry Url cannot be empty",
      };
    }
    return { hasError: false, error: "" };
  };

  const submit = async () => {
    const validation = validate();

    if (validation.hasError) {
      setButtonStatus(validation.error);
      return;
    }

    setButtonStatus("loading");

    try {
      const data = await api
        .connectGCRRegistry(
          "<token>",
          {
            name: registryName,
            gcp_integration_id:
              snap.StateHandler.connected_registry.credentials.id,
            url: registryUrl,
          },
          {
            id: project.id,
          }
        )
        .then((res) => res?.data);

      nextFormStep({
        settings: {
          registry_connection_id: data.id,
          gcr_url: registryUrl,
          registry_name: registryName,
        },
      });
    } catch (error) {
      setButtonStatus("Couldn't connect registry.");
    }
  };
  return (
    <>
      <Helper>
        Provide a name for Porter to use when displaying your registry.
      </Helper>
      <InputRow
        type="text"
        value={registryName}
        setValue={(name: string) => setRegistryName(name)}
        isRequired={true}
        label="🏷️ Registry Name"
        placeholder="ex: paper-straw"
        width="100%"
      />
      <Helper>
        GCR URI, in the form{" "}
        <CodeBlock>[gcr_domain]/[gcp_project_id]</CodeBlock>. For example,{" "}
        <CodeBlock>gcr.io/skynet-dev-172969</CodeBlock>.
      </Helper>
      <InputRow
        type="text"
        value={registryUrl}
        setValue={(url: string) => setRegistryUrl(url)}
        label="🔗 GCR URL"
        placeholder="ex: gcr.io/skynet-dev-172969"
        width="100%"
        isRequired={true}
      />
      <Br />
      <SaveButton
        text="Continue"
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
}> = ({ nextFormStep, project }) => {
  const snap = useSnapshot(StateHandler);
  return (
    <>
      <RegistryImageList
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
