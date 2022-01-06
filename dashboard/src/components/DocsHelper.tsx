import React, { Component, useState } from "react";
import styled, { createGlobalStyle } from "styled-components";
import Button from "@material-ui/core/Button";
import Tooltip from "@material-ui/core/Tooltip";
import { ClickAwayListener, TooltipProps } from "@material-ui/core";

type Props = {
  tooltipText: string;
  link: string;
};

const DocsHelper: React.FC<Props> = ({ tooltipText, link }) => {
  const [open, setOpen] = React.useState(false);

  const handleTooltipClose = () => {
    setOpen(false);
  };

  const handleTooltipOpen = () => {
    setOpen(true);
  };

  const handleTooltipToggle = () => {
    setOpen(!open);
  };

  return (
    <DocsHelperContainer>
      <ClickAwayListener
        onClickAway={() => {
          handleTooltipClose();
        }}
      >
        <div>
          <Tooltip
            PopperProps={{
              disablePortal: true,
              placement: "top-end",
            }}
            onClose={handleTooltipClose}
            open={open}
            interactive
            disableFocusListener
            disableHoverListener
            disableTouchListener
            title={
              <StyledContent onClick={handleTooltipOpen}>
                {tooltipText}
                <A target="_blank" href={link}>
                  Documentation {">"}
                </A>
              </StyledContent>
            }
          >
            <HelperButton onClick={handleTooltipToggle}>
              <i className="material-icons">help_outline</i>
            </HelperButton>
          </Tooltip>
        </div>
      </ClickAwayListener>
      <TooltipStyle />
    </DocsHelperContainer>
  );
};

export default DocsHelper;

const StyledContent = styled.div`
  font-family: "Work Sans", sans-serif;
  font-size: 12px;
  font-weight: normal;
  padding: 12px 14px;
  line-height: 1.5em;
  user-select: text;
  width: calc(100% + 14px);
  height: calc(100% + 10px);
  margin-left: -7px;
  height: 100%;
  background: #2e3135;
  border: 1px solid #aaaabb;
  border-radius: 5px;
`;

const HelperButton = styled.div`
  cursor: pointer;
  display: flex;
  align-items: center;
  margin-left: 10px;
  justify-content: center;
  > i {
    color: #aaaabb;
    width: 24px;
    height: 24px;
    font-size: 20px;
    border-radius: 20px;
  }
`;

const TooltipStyle = createGlobalStyle`
  .MuiTooltip-tooltip {
    background-color: #00000000 !important;
    font-size: 12px !important;
    padding: 0px;
    max-width: 300px !important;    
  }
`;

const A = styled.a`
  display: inline-block;
  height: 20px;
  color: #8590ff;
  text-decoration: underline;
  cursor: pointer;
  width: 100%;
  text-align: right;
  user-select: none;
`;

const DocsHelperContainer = styled.div`
  margin-left: auto;
`;
