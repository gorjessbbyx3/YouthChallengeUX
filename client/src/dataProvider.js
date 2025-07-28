
import { fetchUtils } from 'react-admin';
import jsonServerProvider from 'ra-data-json-server';

const httpClient = (url, options = {}) => {
  if (!options.headers) {
    options.headers = new Headers({ Accept: 'application/json' });
  }
  
  const token = localStorage.getItem('token');
  if (token) {
    options.headers.set('Authorization', `Bearer ${token}`);
  }
  
  return fetchUtils.fetchJson(url, options);
};

const dataProvider = jsonServerProvider('/api', httpClient);

// Custom data provider to handle YCA CRM specific endpoints
const customDataProvider = {
  ...dataProvider,
  
  // Override getList for better error handling
  getList: (resource, params) => {
    return dataProvider.getList(resource, params).catch(error => {
      console.error(`Error fetching ${resource}:`, error);
      throw error;
    });
  },
  
  // Custom endpoint for AI chat
  chat: (message, context) => {
    return httpClient('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    }).then(({ json }) => json);
  },
  
  // Custom endpoint for reports
  getReport: (reportType, params = {}) => {
    return httpClient(`/api/reports/${reportType}`, {
      method: 'GET',
    }).then(({ json }) => json);
  },
  
  // Custom endpoint for sentiment analysis
  analyzeSentiment: (text) => {
    return httpClient('/api/ai/sentiment', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }).then(({ json }) => json);
  }
};

export default customDataProvider;
