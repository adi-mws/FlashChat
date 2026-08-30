import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { selectActiveAttachements } from "../../redux/slices/chatsSlice";
import { fileToBase64 } from "../../lib/imageUtils";

export default function CameraPreview({ show, setAttachments, onClose, onCapture }) {
    const attachments = useSelector(selectActiveAttachements);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const dispatch = useDispatch();
    const openCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false,
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error(error);
        }
    };


    const closeCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => {
                track.stop();
            })
        }

        streamRef.current = null;

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }

    useEffect(() => {
        if (show) {
            openCamera();
        }

        return () => closeCamera();
    }, [show])


    const canvasRef = useRef(null);
    const captureImage = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas) return;


        // Use the actual camera resolution 
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");

        // Copy the current video frame into canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Converting the canvas into an image Blob
        canvas.toBlob(
            async (blob) => {

                if (!blob) return;
                // console.log(blob); // DEBUGGER

                const file = new File(
                    [blob],
                    `flashchat-${Date.now()}.jpg`,
                    {
                        type: "image/jpeg",
                    }
                )

                // console.log("DEBUG_II = > found the file => ", file); // DEBUGGER
                try {

                    const serializedFile = await fileToBase64(file);

                    const newAttachment = {
                        file: file,
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        lastModified: file.lastModified,
                        data: serializedFile,
                    };


                    const newAttachments = [
                        ...attachments,
                        newAttachment,
                    ];


                    dispatch(setAttachments(newAttachments));

                    if (onCapture) {
                        onCapture();
                    }

                } catch (error) {
                }
            },
            "image/jpeg",
            0.9
        );



    }

    return (
        <div className={`dark:bg-zinc-900 height-screen absolute inset-0 z-[100000] ${show ? 'flex' : 'hidden'} flex-col bg-zinc-950 text-white select-none`}>
            <div className="absolute inset-0 z-[100000] flex flex-col bg-zinc-950 text-white select-none">


                {/*  Main Preview Area  */}
                <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative px-4 py-3">
                    {/*  Header Inside the main area for the transparent surface of the camera  */}

                    <div className="flex items-center absolute left-0 top-0 w-full justify-between px-4 py-3 flex-shrink-0 ">
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lgtransition text-white"
                        >
                            <X size={18} />
                        </button>
                        <span className="text-xs text-zinc-400 font-medium tracking-wide">
                        </span>
                        <div className="w-8" />
                    </div>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                    {/* Capture the video  */}

                    <canvas
                        ref={canvasRef}
                        className="hidden"
                    />
                    {/* Send button */}

                    <button
                        onClick={captureImage}
                        className="flex-shrink-0 ring-4 ring-amber-400 hover:ring-3  bottom-10 absolute flex items-center justify-center w-11 h-11 rounded-full bg-white  active:scale-95 transition-all shadow-lg"
                    >

                    </button>

                </div>
            </div>
            {/* Footer Area */}

            <div className="flex-shrink-0 border-t border-zinc-800/80 bg-zinc-900/80 backdrop-blur px-3 py-2.5 flex items-center gap-3">

            </div>
        </div >
    )
}       