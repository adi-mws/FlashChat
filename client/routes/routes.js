// This file contains all the routes for the application including public and protected routes.

const APP_ROOT = "/app";

export const MARKETING_ROUTES = {
    landing: "/",   
    about: "/about", 
    login: "/login",
    register: "/register",
    forgotPassword: "/forgot-password",
    resetPassword: (token) => `/reset-password/${token}`,
};


export const ACCOUNT_ROUTES = {
    profile: `${APP_ROOT}/profile`,
    contacts: `${APP_ROOT}/contacts`,
    linkedDevices: `${APP_ROOT}/linked-devices`,
    updateHistory: `${APP_ROOT}/update-history`,
};

export const CHAT_ROUTES = {
    root: `${APP_ROOT}/chats`,
    chat: (chatId) => `${APP_ROOT}/chats/${chatId}`,
    profile: (id) => `${APP_ROOT}/chats/profile/${id}`,
    linkedDevices: `${APP_ROOT}/chats/linked-devices`,
    updateHistory: `${APP_ROOT}/chats/update-history`,
};