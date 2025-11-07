// filepath: backend/utils/helpers.js
module.exports = {
  formatDate: (date) => {
    return new Date(date).toLocaleDateString();
  },
}