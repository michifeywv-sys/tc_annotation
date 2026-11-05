export const PS_SESSION_KEYS = {
  PORTFOLIO_ID: 'ps_session_portfolio_id',
  PROJECT_ID: 'ps_session_project_id',
  PORTFOLIO_NAME: 'ps_session_portfolio_name',
  PROJECT_NAME: 'ps_session_project_name',
  TEMPLATE_ID: 'ps_session_template_id',
  TEMPLATE_NAME: 'ps_session_template_name',
  STATE_ID: 'ps_session_state_id',
  USER_ID: 'ps_session_user_id',
};

export function getSavedPSProject() {
  const portfolioId = sessionStorage.getItem(PS_SESSION_KEYS.PORTFOLIO_ID) || localStorage.getItem(PS_SESSION_KEYS.PORTFOLIO_ID) || '';
  const projectId = sessionStorage.getItem(PS_SESSION_KEYS.PROJECT_ID) || localStorage.getItem(PS_SESSION_KEYS.PROJECT_ID) || '';
  const portfolioName = sessionStorage.getItem(PS_SESSION_KEYS.PORTFOLIO_NAME) || localStorage.getItem(PS_SESSION_KEYS.PORTFOLIO_NAME) || '';
  const projectName = sessionStorage.getItem(PS_SESSION_KEYS.PROJECT_NAME) || localStorage.getItem(PS_SESSION_KEYS.PROJECT_NAME) || '';
  
  const templateId = sessionStorage.getItem(PS_SESSION_KEYS.TEMPLATE_ID) || localStorage.getItem(PS_SESSION_KEYS.TEMPLATE_ID) || '';
  const templateName = sessionStorage.getItem(PS_SESSION_KEYS.TEMPLATE_NAME) || localStorage.getItem(PS_SESSION_KEYS.TEMPLATE_NAME) || '';
  const stateId = sessionStorage.getItem(PS_SESSION_KEYS.STATE_ID) || localStorage.getItem(PS_SESSION_KEYS.STATE_ID) || '';
  const userId = sessionStorage.getItem(PS_SESSION_KEYS.USER_ID) || localStorage.getItem(PS_SESSION_KEYS.USER_ID) || '';

  return { portfolioId, projectId, portfolioName, projectName, templateId, templateName, stateId, userId };
}

export function getPsPortfolioId(): string {
  return sessionStorage.getItem(PS_SESSION_KEYS.PORTFOLIO_ID) || localStorage.getItem(PS_SESSION_KEYS.PORTFOLIO_ID) || '';
}

export function getPsProjectId(): string {
  return sessionStorage.getItem(PS_SESSION_KEYS.PROJECT_ID) || localStorage.getItem(PS_SESSION_KEYS.PROJECT_ID) || '';
}

export function getPsTemplateId(): string {
  return sessionStorage.getItem(PS_SESSION_KEYS.TEMPLATE_ID) || localStorage.getItem(PS_SESSION_KEYS.TEMPLATE_ID) || '';
}


export function savePSProject(
  portfolioId: string, 
  projectId: string, 
  portfolioName: string, 
  projectName: string,
  templateId: string = '',
  templateName: string = '',
  stateId: string = '',
  userId: string = ''
) {
  sessionStorage.setItem(PS_SESSION_KEYS.PORTFOLIO_ID, portfolioId);
  sessionStorage.setItem(PS_SESSION_KEYS.PROJECT_ID, projectId);
  sessionStorage.setItem(PS_SESSION_KEYS.PORTFOLIO_NAME, portfolioName);
  sessionStorage.setItem(PS_SESSION_KEYS.PROJECT_NAME, projectName);

  localStorage.setItem(PS_SESSION_KEYS.PORTFOLIO_ID, portfolioId);
  localStorage.setItem(PS_SESSION_KEYS.PROJECT_ID, projectId);
  localStorage.setItem(PS_SESSION_KEYS.PORTFOLIO_NAME, portfolioName);
  localStorage.setItem(PS_SESSION_KEYS.PROJECT_NAME, projectName);

  if (templateId) {
    sessionStorage.setItem(PS_SESSION_KEYS.TEMPLATE_ID, templateId);
    sessionStorage.setItem(PS_SESSION_KEYS.TEMPLATE_NAME, templateName);
    sessionStorage.setItem(PS_SESSION_KEYS.STATE_ID, stateId);
    sessionStorage.setItem(PS_SESSION_KEYS.USER_ID, userId);

    localStorage.setItem(PS_SESSION_KEYS.TEMPLATE_ID, templateId);
    localStorage.setItem(PS_SESSION_KEYS.TEMPLATE_NAME, templateName);
    localStorage.setItem(PS_SESSION_KEYS.STATE_ID, stateId);
    localStorage.setItem(PS_SESSION_KEYS.USER_ID, userId);
  }

  window.dispatchEvent(new CustomEvent('ps-project-changed', {
    detail: { portfolioId, projectId, portfolioName, projectName, templateId, templateName, stateId, userId }
  }));
}
