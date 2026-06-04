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

export const SETTINGS_ROUTES = {
    profile: `/settings/profile`,
    linkedDevices: `${APP_ROOT}/linked-devices`,
    updateHistory: `${APP_ROOT}/update-history`,
}


export const ACCOUNT_ROUTES = {
    profile: `${APP_ROOT}/profile`,
    contacts: `${APP_ROOT}/contacts`,

};

export const CHAT_ROUTES = {
    root: `${APP_ROOT}/chats`,
    chat: (chatId) => `/chat/${chatId}`,
    group: (groupId) => `/group/${groupId}`,
    profile: (id) => `/profile/${id}`,
};

export const SPARK_ROUTES = {
    root: `${APP_ROOT}/sparks`,
    spark: (sparkId) => `/sparks/${sparkId}`
}

export const INFO_ROUTES = {
    chat: (userId) => `/chat/${userId}/info`,
    group: (groupId) => `/group/${groupId}/info`
}