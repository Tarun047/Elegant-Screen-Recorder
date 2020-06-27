/* eslint-disable func-names */
/* eslint-disable promise/always-return */
/* eslint-disable promise/catch-or-return */
/* eslint-disable jsx-a11y/media-has-caption */
import React from 'react';
import electron, { DesktopCapturerSource } from 'electron';
import {
  Button,
  Typography,
  IconButton,
  makeStyles,
  Paper,
  DialogTitle,
  DialogContent,
  FormControl,
  Select,
  MenuItem,
  Dialog,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Collapse,
} from '@material-ui/core';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import StopIcon from '@material-ui/icons/Stop';
import PauseIcon from '@material-ui/icons/Pause';
import Alert from '@material-ui/lab/Alert';
import CloseIcon from '@material-ui/icons/Close';
import ffmpeg from 'fluent-ffmpeg';

const ffmpegPath = electron.remote.getGlobal('ffmpegpath');
console.log(ffmpegPath);
ffmpeg.setFfmpegPath(ffmpegPath);

const { Readable } = require('stream');

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
  },
  details: {
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    flex: '1 0 auto',
  },
  cover: {
    width: 151,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    paddingLeft: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
  playIcon: {
    height: 38,
    width: 38,
    flexGrow: 1,
  },
  formControl: {
    display: 'flex',
    flexGrow: 1,
    padding: theme.spacing(2),
  },
  mediaItem: {
    display: 'block',
    flexGrow: 1,
    textAlign: 'center',
  },
}));

export default function HomePage() {
  document.title = 'ScreenRecorder';
  const classes = useStyles();
  const videoRef = React.createRef<HTMLVideoElement>();
  const [isRecording, setIsRecording] = React.useState(false);
  const [sources, setSouces] = React.useState<DesktopCapturerSource[]>([]);
  const [selectedSource, setSelectedSource] = React.useState(0);
  const [myMediaRecorder, setMyMediaRecorder] = React.useState<MediaRecorder>(
    null
  );
  let blobs: Blob[]= [];
  const [readOptions, setReadOptions] = React.useState(false);
  const [recordAudio, setRecordAudio] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState('Some Message');
  const [progress,setProgress] = React.useState()
  // eslint-disable-next-line prefer-const

  const doTranscode = async (
    filepath: string,
    inputPath: string | ReadableStream
  ) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .toFormat('mp4')
      .on('error', function (err) {
        console.log(`An error occurred: ${err.message}`);
      })
      .on('progress',function (progress){
        setMessage(`Transcoding ...`);
        setOpen(true);
      })
      .on('end', function () {
        console.log('Processing finished !');
        blobs = []
        setMessage(`Recording saved to: ${filepath}`);
        setOpen(true);
      })
      .save(filepath);
  };

  function handleDataAvailable(event: BlobEvent) {
    if (event.data.size > 0) {
       blobs.push(event.data)
    }
  }

  async function handleRecordingStopped() {
    const file = electron.remote.dialog.showSaveDialogSync({
      properties: ['showOverwriteConfirmation'],
      title: 'Capture.mp4',
    });
    if (file) {
      console.log(blobs);
      const buffer = toBuffer(
        await new Blob(blobs, { type: 'video/webm' }).arrayBuffer()
      );
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);
      await doTranscode(file, stream);
    }
  }

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: selectedSource,
          minWidth: 1280,
          maxWidth: 1280,
          minHeight: 720,
          maxHeight: 720,
        },
      },
    });

    if (recordAudio) {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      const audioTracks = await audioStream.getAudioTracks();
      stream.addTrack(audioTracks[0]);
    }
    videoRef.current.srcObject = stream;
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
    });
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.onstop = handleRecordingStopped;
    mediaRecorder.start(1000);
    setMyMediaRecorder(mediaRecorder);
    setIsRecording(true);
    setReadOptions(false);
  };

  const startCapture = async () => {
    if (myMediaRecorder !== null) {
      myMediaRecorder.resume();
      setIsRecording(true);
      return;
    }
    const allSources = await electron.desktopCapturer.getSources({
      types: ['window', 'screen'],
    });
    setSouces(allSources);
    setReadOptions(true);
  };


  function toBuffer(ab: ArrayBuffer) {
    const buffer = new Buffer(ab.byteLength);
    const arr = new Uint8Array(ab);
    for (let i = 0; i < arr.byteLength; i++) {
      buffer[i] = arr[i];
    }
    return buffer;
  }

  const stopRecording = () => {
    (videoRef.current.srcObject as MediaStream)
      .getTracks()
      .forEach((track) => track.stop());
    myMediaRecorder.stop();
    setMyMediaRecorder(null);
  };

  const stopCapture = async () => {
    stopRecording();
    setIsRecording(false);
  };

  const handlePause = () => {
    myMediaRecorder.pause();
    setIsRecording(false);
  };

  return (
    <>
      <Paper>
        <div className={classes.controls}>
          <div className={classes.mediaItem}>
            <IconButton onClick={startCapture} disabled={isRecording}>
              <PlayArrowIcon className={classes.playIcon} />
            </IconButton>
          </div>
          <div className={classes.mediaItem}>
            <IconButton onClick={handlePause} disabled={!isRecording}>
              <PauseIcon className={classes.playIcon} />
            </IconButton>
          </div>
          <div className={classes.mediaItem}>
            <IconButton onClick={stopCapture} disabled={!isRecording}>
              <StopIcon className={classes.playIcon} />
            </IconButton>
          </div>
        </div>
        <Collapse in={open}>
          <Alert
            severity="info"
            action={
              // eslint-disable-next-line react/jsx-wrap-multilines
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => {
                  setOpen(false);
                }}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            {message}
          </Alert>
        </Collapse>
      </Paper>
      <Dialog open={readOptions} onClose={() => setReadOptions(false)}>
        <DialogTitle id="alert-dialog-title">
          <Typography style={{ color: '#000' }}>
            Screen Recording settings
          </Typography>
        </DialogTitle>
        <DialogContent>
          <div>
            <FormControl className={classes.formControl}>
              <InputLabel id="sourceLbl">Video Source</InputLabel>
              <Select
                labelId="sourceLbl"
                value={selectedSource}
                onChange={(evt) => setSelectedSource(evt.target.value)}
              >
                {sources.map((source) => (
                  <MenuItem key={source.id} value={source.id}>
                    {source.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                // eslint-disable-next-line react/jsx-wrap-multilines
                <Checkbox
                  checked={recordAudio}
                  onChange={() => setRecordAudio(event.target.checked)}
                  name="checkedB"
                  color="primary"
                />
              }
              label="Record Audio"
            />
          </div>
        </DialogContent>
        <DialogContent>
          <Button onClick={startRecording}>Ok</Button>
          <Button onClick={() => setReadOptions(false)}>Cancel</Button>
        </DialogContent>
      </Dialog>
      <video ref={videoRef} autoPlay muted />
    </>
  );
}
