const APP_ROOT = "/app";

export const MOBILE_BREAKPOINT = 640;
export const getIsMobile = () => window.innerWidth < MOBILE_BREAKPOINT;

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
    linkedDevices: `/settings/linked-devices`,
    updateHistory: `/settings/update-history`,
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