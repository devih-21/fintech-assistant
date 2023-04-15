import React, { useRef, useState, useEffect } from "react";
import { useOpenAI } from "@/context/OpenAIProvider";
import { MdKeyboardVoice, MdSend } from "react-icons/md";
import { WaveFile } from "wavefile";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

type Props = {};

export default function ChatInput({}: Props) {
  const { addMessage, loading } = useOpenAI();
  const [loadingGen, setLoadingGen] = useState(false);
  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);
  const mimeType = "audio/webm";

  const [input, setInput] = React.useState("");

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (loading) return;
    e.preventDefault();
    addMessage(input, true, "user");
    setInput("");
  };

  React.useEffect(() => {
    const resize = () => {
      if (textAreaRef.current) {
        textAreaRef.current.style.height = "40px";
        textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
      }
    };

    resize();
  }, [input]);

  const [permission, setPermission] = useState(false);
  const mediaRecorder = useRef<(() => any) | any>(null);

  const [recordingStatus, setRecordingStatus] = useState("inactive");
  const [stream, setStream] = useState<any>(null);
  const [audioChunks, setAudioChunks] = useState<BlobPart[]>([]);

  const startRecording = async () => {
    setRecordingStatus("recording");
    //create new Media recorder instance using the stream
    const media = new MediaRecorder(stream, { mimeType });
    //set the MediaRecorder instance to the mediaRecorder ref
    mediaRecorder.current = media;
    //invokes the start method to start the recording process
    mediaRecorder.current.start();
    let localAudioChunks: any = [];
    mediaRecorder.current.ondataavailable = (event: any) => {
      if (typeof event.data === "undefined") return;
      if (event.data.size === 0) return;
      localAudioChunks.push(event.data);
    };
    setAudioChunks(localAudioChunks);
  };

  const stopRecording = () => {
    setLoadingGen(true);
    setRecordingStatus("inactive");
    //stops the recording instance
    mediaRecorder.current.stop();
    mediaRecorder.current.onstop = async () => {
      //creates a blob file from the audiochunks data
      const audioBlob = new Blob(audioChunks, { type: mimeType });
      const audioUrl = URL.createObjectURL(audioBlob);

      await fetch("https://api.fpt.ai/hmi/asr/general", {
        method: "Post",
        headers: {
          api_key: "filhkxjjtOb8LBegg8ZrxV1LObW9M8Jt",
        },
        body: audioBlob,
      })
        .then((res) => res.json())
        .then((data) => {
          const { status, hypotheses } = data;
          if (status === 0) {
            setInput((preState) => preState + hypotheses[0].utterance);
          } else {
            toast.error("Đã có lỗi xảy ra vui lòng thử lại!", {
              position: "top-center",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              theme: "light",
            });
          }
        });
      //creates a playable URL from the blob file.
      setLoadingGen(false);
      setAudioChunks([]);
    };
  };

  const getMicrophonePermission = async () => {
    if ("MediaRecorder" in window) {
      try {
        const streamData = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        setPermission(true);
        setStream(streamData);
      } catch (err: any) {
        alert(err.message);
      }
    } else {
      alert("The MediaRecorder API is not supported in your browser.");
    }
  };

  return (
    <>
      <ToastContainer />
      <div className="fixed bottom-0 flex h-40 w-full bg-gradient-to-t from-[rgb(var(--bg-secondary))] to-transparent md:w-[calc(100%-260px)]">
        <form
          className="mx-auto flex h-full w-full max-w-4xl items-center justify-center p-4 pb-10"
          onSubmit={handleSubmit}
        >
          <div className="mr-5 rounded rounded-xl border border-stone-500/20 bg-tertiary p-1 text-center text-primary shadow-xl">
            {!permission ? (
              <button onClick={getMicrophonePermission} type="button">
                Enable Micro
              </button>
            ) : null}
            {permission && recordingStatus === "inactive" ? (
              loadingGen ? (
                <div className="mx-auto h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
              ) : (
                <button onClick={startRecording} type="button">
                  <span
                    style={{
                      verticalAlign: "middle",
                      display: "inline-block",
                    }}
                  >
                    Start
                  </span>
                  <span
                    style={{
                      verticalAlign: "middle",
                      display: "inline-block",
                    }}
                  >
                    <MdKeyboardVoice />
                  </span>
                </button>
              )
            ) : null}
            {recordingStatus === "recording" ? (
              <button onClick={stopRecording} type="button">
                <span
                  style={{
                    verticalAlign: "middle",
                    display: "inline-block",
                  }}
                >
                  Stop
                </span>
                <span
                  style={{
                    verticalAlign: "middle",
                    display: "inline-block",
                  }}
                >
                  <MdKeyboardVoice />
                </span>
              </button>
            ) : null}
          </div>
          <div className="relative flex w-full flex-row rounded rounded-xl border border-stone-500/20 bg-tertiary ">
            <textarea
              ref={textAreaRef}
              className="max-h-[200px] w-full resize-none border-none bg-tertiary p-4 text-primary outline-none"
              onChange={handleChange}
              value={input}
              rows={1}
            />
            <button
              type="submit"
              className="rounded p-4 text-primary hover:bg-primary/50"
            >
              {loading ? (
                <div className="mx-auto h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
              ) : (
                <MdSend />
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
