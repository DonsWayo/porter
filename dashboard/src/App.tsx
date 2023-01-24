import React, { Component } from "react";
import { BrowserRouter } from "react-router-dom";
import PorterErrorBoundary from "shared/error_handling/PorterErrorBoundary";
import styled, { createGlobalStyle } from "styled-components";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import MainWrapper from "./main/MainWrapper";
import { Toaster } from "react-hot-toast";

const queryClient = new QueryClient();

export default class App extends Component {
  render() {
    return (
      <QueryClientProvider client={queryClient}>
        <StyledMain>
          <GlobalStyle />
          <PorterErrorBoundary errorBoundaryLocation="globalErrorBoundary">
            <BrowserRouter>
              <MainWrapper />
              <Toaster
                toastOptions={{
                  style: {
                    background: "#272731cc",
                    border: "1px solid #ffffff55",
                    color: "#ffffff",
                    padding: "15px",
                  },
                }}
                position="bottom-left"
              />
            </BrowserRouter>
          </PorterErrorBoundary>
        </StyledMain>
      </QueryClientProvider>
    );
  }
}

const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
    font-family: 'Work Sans', sans-serif;
    color-scheme: dark;
  }
  
  body {
    background: #202227;
    overscroll-behavior-x: none;
  }

  a {
    color: #949eff;
    text-decoration: none;
  }

  img {
    max-width: 100%;
  }
`;

const StyledMain = styled.div`
  height: 100vh;
  width: 100vw;
  position: fixed;
  top: 0;
  left: 0;
  background: #202227;
  color: white;
`;
