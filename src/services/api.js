import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor to map gameId -> id for compatibility
api.interceptors.response.use(
  (response) => {
    if (response.data) {
      // Map single object
      if (response.data.gameId !== undefined) {
        response.data.id = response.data.gameId;
      }
      // Map array of objects
      if (Array.isArray(response.data)) {
        response.data = response.data.map(item => {
          if (item.gameId !== undefined) {
            return { ...item, id: item.gameId };
          }
          return item;
        });
      }
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// User endpoints
export const userApi = {
  getCurrentUser: () => api.get('/user/me'),
  getAllUsers: () => api.get('/user'),
  getUserById: (id) => api.get(`/user/${id}`)
};

// Game endpoints
export const gameApi = {
  getAllGames: () => api.get('/games'),
  getUpcomingGames: () => api.get('/games/upcoming'),
  getFinishedGames: () => api.get('/games/finished'),
  getGameById: (id) => api.get(`/games/${id}`)
};

// Prediction endpoints
export const predictionApi = {
  getMyPredictions: () => api.get('/predictions/my'),
  getPredictionById: (id) => api.get(`/predictions/${id}`),
  createPrediction: (data) => api.post('/predictions', data),
  updatePrediction: (id, data) => api.put(`/predictions/${id}`, data),
  deletePrediction: (id) => api.delete(`/predictions/${id}`)
};

// Ranking endpoints
export const rankingApi = {
  getRankingHistory: () => api.get('/ranking')
};

// Comment endpoints
export const commentApi = {
  getAllComments: () => api.get('/comments'),
  createComment: (data) => api.post('/comments', data)
};

// Results endpoints
export const resultsApi = {
  getMyPredictionResults: () => api.get('/results/my-prediction-result'),
  getAllUsersPredictionResults: (gameId) => api.get(`/results/allusers-prediction-result/${gameId}`)
};

// Auth endpoints
export const authApi = {
  checkAuth: () => api.get('/auth/check'),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout')
};

// Dashboard - compose from multiple endpoints
export const dashboardApi = {
  getDashboardData: async () => {
    try {
      const [user, upcomingGames, finishedGames, myPredictions, ranking] = await Promise.all([
        userApi.getCurrentUser(),
        gameApi.getUpcomingGames(),
        gameApi.getFinishedGames(),
        predictionApi.getMyPredictions(),
        rankingApi.getRankingHistory()
      ]);

      return {
        user: user.data,
        upcomingGames: upcomingGames.data,
        finishedGames: finishedGames.data,
        myPredictions: myPredictions.data,
        ranking: ranking.data
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }
};

export default api;
