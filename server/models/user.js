//users Model
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: {
        type: String, 
        required: true,
        unique: true, 
    },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true
    },
    pfp: {
        type: String,
        required: false,
        default: 'uploads/pfps/default-pfp.jpg'
    },

    chats: [{
        type: mongoose.Types.ObjectId,
        ref: 'Chat',
    }],
});

const User = mongoose.model('user', userSchema);

export default User;
