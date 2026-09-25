import React from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectChats } from '../../redux/slices/chatsSlice'
import ProfilePage from '../settings/Profile'
import { INFO_ROUTES } from '../../../routes/routes'

export default function ChatInfo() {
    const { chatId } = useParams();
    const chats = useSelector(selectChats);
    const chat = chats.find(c => c._id === chatId);

    if (chat?.isGroupChat) {
        return <Navigate to={INFO_ROUTES.group(chatId)} replace />;
    }

    const participantId = chat?.participant?._id;

    return (
        <ProfilePage targetUserId={participantId} />
    )
}
