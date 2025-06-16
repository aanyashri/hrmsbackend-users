const moment = require("moment");

const formatDate = (date, format = "YYYY-MM-DD") => {
  return moment(date).format(format);
};

const getCurrentDate = () => {
  return moment().format("YYYY-MM-DD");
};

const getCurrentDateTime = () => {
  return moment().format("YYYY-MM-DD HH:mm:ss");
};

const addDays = (date, days) => {
  return moment(date).add(days, "days").format("YYYY-MM-DD");
};
//
const subtractDays = (date, days) => {
  return moment(date).subtract(days, "days").format("YYYY-MM-DD");
};

const getDaysBetween = (startDate, endDate) => {
  return moment(endDate).diff(moment(startDate), "days");
};

const isWeekend = (date) => {
  const day = moment(date).day();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
};

const getMonthName = (monthNumber) => {
  return moment()
    .month(monthNumber - 1)
    .format("MMMM");
};

module.exports = {
  formatDate,
  getCurrentDate,
  getCurrentDateTime,
  addDays,
  subtractDays,
  getDaysBetween,
  isWeekend,
  getMonthName,
};
