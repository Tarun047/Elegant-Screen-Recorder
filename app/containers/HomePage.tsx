/* eslint-disable jsx-a11y/media-has-caption */
import React from 'react';
import electron, { DesktopCapturerSource } from 'electron';
import {
  Button,
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  CardMedia,
  useTheme,
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
} from '@material-ui/core';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import StopIcon from '@material-ui/icons/Stop';
import PauseIcon from '@material-ui/icons/Pause';
import fs from 'fs';

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
  const classes = useStyles();
  const videoRef = React.createRef<HTMLVideoElement>();
  const [isRecording, setIsRecording] = React.useState(false);
  const [sources, setSouces] = React.useState<DesktopCapturerSource[]>([]);
  const [selectedSource, setSelectedSource] = React.useState(0);
  const [myMediaRecorder, setMyMediaRecorder] = React.useState<MediaRecorder>(
    null
  );
  const blobs: Blob[] = [];
  const [readOptions, setReadOptions] = React.useState(false);
  const [recordAudio, setRecordAudio] = React.useState(false);
  // eslint-disable-next-line prefer-const

  function handleDataAvailable(event: BlobEvent) {
    if (event.data.size > 0) {
      blobs.push(event.data);
      toArrayBuffer(function (ab) {
        const buffer = toBuffer(ab);
        const fileResponse = electron.remote.dialog.showOpenDialogSync({
          properties: ['openDirectory'],
        });
        if (fileResponse && fileResponse[0]) {
          const file = `${
            fileResponse[0]
          }/Capture-${new Date().toISOString()}.webm`;
          fs.writeFile(file, buffer, function (err) {
            if (err) {
              console.error(`Failed to save video ${err}`);
            } else {
              console.log(`Saved video: ${file}`);
            }
          });
        }
      });
    }
  }

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: recordAudio && {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: selectedSource,
        },
      },
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
    videoRef.current.srcObject = stream;
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start();
    setMyMediaRecorder(mediaRecorder);
    setIsRecording(true);
    setReadOptions(false);
  };

  const startCapture = async () => {
    document.title = 'ScreenRecorder';
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

  function toArrayBuffer(cb: (ab: ArrayBuffer) => void) {
    const fileReader = new FileReader();
    fileReader.onload = function () {
      const arrayBuffer = this.result;
      cb(arrayBuffer as ArrayBuffer);
    };
    fileReader.readAsArrayBuffer(new Blob(blobs, { type: 'video/webm' }));
  }

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
      <video ref={videoRef} autoPlay />
    </>
  );
}
