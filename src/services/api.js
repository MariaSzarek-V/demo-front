import axios from 'axios';

// Use relative URL for production (proxied by nginx) or absolute for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:8080/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor to map gameId -> id for compatibility (only for objects without existing id)
api.interceptors.response.use(
  (response) => {
    if (response.data) {
      // Map single object - tylko jeśli nie ma już pola 'id'
      if (response.data.gameId !== undefined && response.data.id === undefined) {
        response.data.id = response.data.gameId;
      }
      // Map array of objects - tylko jeśli nie mają już pola 'id'
      if (Array.isArray(response.data)) {
        response.data = response.data.map(item => {
          if (item.gameId !== undefined && item.id === undefined) {
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
  getUserById: (id) => api.get(`/user/${id}`),
  updateProfile: (data) => api.put('/user/profile', data),
  changePassword: (data) => api.put('/user/change-password', data)
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
  getMyPredictionHistory: (leagueId) => api.get(`/predictions/my/history?leagueId=${leagueId}`),
  getPredictionById: (id) => api.get(`/predictions/${id}`),
  createPrediction: (data) => api.post('/predictions', data),
  updatePrediction: (id, data) => api.put(`/predictions/${id}`, data),
  deletePrediction: (id) => api.delete(`/predictions/${id}`)
};

// Ranking endpoints
export const rankingApi = {
  getRankingHistory: () => api.get('/ranking'),
  getRankingByLeague: (leagueId) => api.get(`/ranking/league/${leagueId}`),
  getRankingHistoryForChart: (leagueId) => api.get(`/ranking/history/chart?leagueId=${leagueId}`)
};

// Compare endpoints
export const compareApi = {
  compareWithUser: (userId) => api.get(`/compare/${userId}`)
};

// Chat endpoints
export const chatApi = {
  getAllMessages: (leagueId = null) => {
    const url = leagueId ? `/chat?leagueId=${leagueId}` : '/chat';
    return api.get(url);
  },
  createMessage: (data) => api.post('/chat', data),
  addReaction: (messageId, emoji) => api.post(`/chat/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`),
  removeReaction: (messageId, emoji) => api.delete(`/chat/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`)
};

// Results endpoints
export const resultsApi = {
  getMyPredictionResults: () => api.get('/results/my-prediction-result'),
  getAllUsersPredictionResults: (gameId) => api.get(`/results/allusers-prediction-result/${gameId}`),
  getPredictionPatternStats: (leagueId) => api.get(`/results/prediction-pattern-stats?leagueId=${leagueId}`)
};

// Auth endpoints
export const authApi = {
  checkAuth: () => api.get('/auth/check'),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout')
};

// Posts endpoints
export const postApi = {
  getAllPosts: (page = 0, size = 10, leagueId = null) => {
    const url = leagueId
      ? `/posts?page=${page}&size=${size}&leagueId=${leagueId}`
      : `/posts?page=${page}&size=${size}`;
    return api.get(url);
  },
  getPostById: (id) => api.get(`/posts/${id}`),
  createPost: (data) => api.post('/posts', data),
  updatePost: (id, data) => api.put(`/posts/${id}`, data),
  deletePost: (id) => api.delete(`/posts/${id}`),
  addReaction: (postId, emoji) => api.post(`/posts/${postId}/reactions?emoji=${encodeURIComponent(emoji)}`),
  removeReaction: (postId, emoji) => api.delete(`/posts/${postId}/reactions?emoji=${encodeURIComponent(emoji)}`)
};

// Post Comments endpoints
export const commentApi = {
  getCommentsByPostId: (postId) => api.get(`/posts/${postId}/comments`),
  createComment: (postId, data) => api.post(`/posts/${postId}/comments`, data),
  updateComment: (commentId, data) => api.put(`/posts/comments/${commentId}`, data),
  deleteComment: (commentId) => api.delete(`/posts/comments/${commentId}`),
  addReaction: (commentId, emoji) => api.post(`/posts/comments/${commentId}/reactions?emoji=${encodeURIComponent(emoji)}`),
  removeReaction: (commentId, emoji) => api.delete(`/posts/comments/${commentId}/reactions?emoji=${encodeURIComponent(emoji)}`)
};

// Admin endpoints
export const adminApi = {
  getAllGames: () => api.get('/admin/games'),
  getGameById: (id) => api.get(`/admin/games/${id}`),
  createGame: (data) => api.post('/admin/games', data),
  updateGame: (id, data) => api.put(`/admin/games/${id}`, data),
  deleteGame: (id) => api.delete(`/admin/games/${id}`)
};

// Country endpoints
export const countryApi = {
  getAllCountries: () => api.get('/countries')
};

// League endpoints
export const leagueApi = {
  getAllActiveLeagues: () => api.get('/leagues'),
  getLeagueById: (id) => api.get(`/leagues/${id}`),
  getMyLeagues: () => api.get('/leagues/my-leagues'),
  createLeague: (data) => api.post('/leagues', data),
  joinLeague: (leagueId) => api.post(`/leagues/${leagueId}/join`),
  leaveLeague: (leagueId) => api.delete(`/leagues/${leagueId}/leave`),
  getLeagueMembers: (leagueId) => api.get(`/leagues/${leagueId}/members`)
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

// Notification endpoints
export const notificationApi = {
  getUpcomingGamesNotifications: () => api.get('/notifications/upcoming-games'),
  getUnreadPostsCount: (leagueId = null) => {
    const url = leagueId ? `/posts/unread-count?leagueId=${leagueId}` : '/posts/unread-count';
    return api.get(url);
  }
};

export default api;
