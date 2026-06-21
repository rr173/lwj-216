"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = formatDate;
exports.formatDateTime = formatDateTime;
exports.getStartOfDay = getStartOfDay;
exports.getEndOfDay = getEndOfDay;
exports.getTimeSlotStart = getTimeSlotStart;
exports.getTimeSlotEnd = getTimeSlotEnd;
exports.getCurrentSlotIndex = getCurrentSlotIndex;
exports.getTotalSlotCount = getTotalSlotCount;
exports.isInTimeSlot = isInTimeSlot;
exports.roundToCents = roundToCents;
exports.roundToDecimals = roundToDecimals;
exports.generateRandomId = generateRandomId;
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${formatDate(timestamp)} ${hours}:${minutes}:${seconds}`;
}
function getStartOfDay(timestamp) {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
}
function getEndOfDay(timestamp) {
    const date = new Date(timestamp);
    date.setHours(23, 59, 59, 999);
    return date.getTime();
}
function getTimeSlotStart(timestamp, startHour, slotIndex) {
    const date = new Date(timestamp);
    date.setHours(startHour, 0, 0, 0);
    return date.getTime() + slotIndex * 15 * 60 * 1000;
}
function getTimeSlotEnd(timestamp, startHour, slotIndex) {
    return getTimeSlotStart(timestamp, startHour, slotIndex) + 15 * 60 * 1000 - 1;
}
function getCurrentSlotIndex(timestamp, startHour) {
    const date = new Date(timestamp);
    const currentMinutes = (date.getHours() - startHour) * 60 + date.getMinutes();
    return Math.floor(currentMinutes / 15);
}
function getTotalSlotCount(startHour, endHour) {
    const totalMinutes = (endHour - startHour) * 60;
    return Math.floor(totalMinutes / 15);
}
function isInTimeSlot(timestamp, startHour, endHour) {
    const date = new Date(timestamp);
    const hour = date.getHours();
    return hour >= startHour && hour < endHour;
}
function roundToCents(amount) {
    return Math.round(amount * 100) / 100;
}
function roundToDecimals(amount, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(amount * factor) / factor;
}
function generateRandomId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
//# sourceMappingURL=index.js.map