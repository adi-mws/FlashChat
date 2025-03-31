//users Model
import mongoose from "mongoose";
const userSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    pfp : {
        type: String, 
        required: false,
        default: '/uploads/pfps/default-pfp.jpg'
    }
});

const User = mongoose.model('user', userSchema);

export default User;
