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
        required: function () {
            return this.type === 'normal';
        }
    },
    googleId: {
        type: String,
        required: function () {
            return this.type === 'google';
        }
    },
    pfp: {
        type: String,
        default: 'uploads/pfps/default-pfp.jpeg'
    },
    type: {
        type: String, 
        enum: ['normal', 'google'],
        required: true
    }
});

const User = mongoose.model('User', userSchema);

export default User;
