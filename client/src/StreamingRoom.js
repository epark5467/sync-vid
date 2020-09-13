import React, { useState, useEffect, useRef } from 'react';
import io from "socket.io-client";
import PropTypes from 'prop-types';
import Screenfull from 'screenfull';
import SwipeableViews from 'react-swipeable-views';
import { Link } from "react-router-dom";
import { TextField, Paper, IconButton, AppBar, Slider,
         Toolbar, Button, Grid, Tabs, Tab, Box, InputAdornment,
         Input, List, ListItem, ListItemText, ListItemSecondaryAction} from '@material-ui/core';
import { Send, PlaylistPlay, ChatBubble, GitHub, AccountCircle,
         SkipNext, AddBox, Delete, Check, VolumeUp, Fullscreen,
         People } from '@material-ui/icons';
import { useTheme } from '@material-ui/core/styles';
import ReactPlayer from 'react-player/youtube';
import { findDOMNode } from 'react-dom';


const NEW_MESSAGE = 'new_message';
const socket = io({ transports: ['websocket'], upgrade: false });

const StreamingRoom = (props) => {
    
    const roomName = props.match.params.roomName;
    const viewTheme = useTheme();

    // SOCKET.IO parameters
    const PLAY_VIDEO = "play_video";

    const videoRef = useRef(null);

    // User info
    const [ username, setUsername ] = useState("");
    const [ newUserName, setNewUserName ] = useState("");
    const [ color, setColor ] = useState("");
    const [ userRole, setRole ] = useState("");

    const [ newMsg, setNewMsg ] = useState("");
    const [ receivedMsg, setReceivedMsg ] = useState([]);

    const [ tabValue, setTabValue ] = useState(0);

    const [ newURL, setNewURL ] = useState("");
    const [ playlist, setPlaylist ] = useState([]);
    const [ videoProp, setVideoProp ] = useState({
        url: null,
        playing: true,
        volume: 0.3,
        played: 0,
        loaded: 0,
        duration: 0,
        playbackRate: 1.0,
        loop: false
    });

    const [ userlist, setUserList ] = useState([]);


    useEffect(() => {
        socket.emit('JOIN_ROOM', roomName );

        socket.on('INCOMING_MESSAGE', message => {
            const incomingMessage = {
                ...message, sentByCurrentUser: message.sender.username === username
            };
            setReceivedMsg( receivedMsg => [...receivedMsg, incomingMessage]);
        });

        socket.on("get_users", items => {
            setUserList(items);
        });

        socket.on("user_info", data => {
            setUsername(data.username);
            setNewUserName(data.username);
            setColor(data.color);
            if(data.role !== userRole) {
                socket.emit("change_role", data.role);
                setRole(data.role);
            }
        });

        socket.on("get_playlist", items => {
            setPlaylist(items);
        });

        socket.on("change_current_video", url => {
            setVideoProp({...videoProp,  url: url });
        });

        socket.on("current_video_request", userId => {
            let data = { user: userId, url: videoRef.current.props.url, played: videoRef.current.getCurrentTime()}
            socket.emit("current_video_prop", data);
        });

        socket.on("update_video", data => {
            setVideoProp({...videoProp,  url: data.url, played: data.played, playing: true });
            videoRef.current.seekTo(data.played);
        });

        return () => {
            socket.disconnect();
        }
    }, [roomName]);


    /**
     * React Player methods
     */
    const handleURLInput = () => {
        if (ReactPlayer.canPlay(newURL)) {
            let isPlaying = false;
            if(videoProp.url !=="" && videoProp.url !== null) 
                isPlaying = true;
            let data = { url: newURL, isPlaying: isPlaying};
            socket.emit("add_new_video", data);
            setNewURL("");
        } else {
            alert("this is not a valid link");
        }
    };
    
    const handleURLChange = (event) => {
        setNewURL(event.target.value);
    }

    const removePlaylistItem = (index) => {
        let clone = playlist.splice(index, 1);
        setPlaylist(clone);
        socket.emit("update_playlist", playlist);
    }

    const changeCurrentVideo = (index) => {
        socket.emit(PLAY_VIDEO, index);
    };

    const playNextVideo = () => {
        socket.emit(PLAY_VIDEO, 0); // plays the next video from the playlist.
    }

    const handleVolumeChange = (e, value) => {
        setVideoProp({ ...videoProp, volume: parseFloat(value)/100});
    }

    const handleSeekChange = (e, value) => {
        //setVideoProp({...videoProp, played: parseFloat(value)/100});
        //videoRef.current.seekTo(parseFloat(value)/100);
        let data = { user: "all", url: videoRef.current.props.url, played: parseFloat(value)/100}
        socket.emit("current_video_prop", data);
    }
    
    const handleProgress = (state) => {
        setVideoProp({...videoProp,  played: parseFloat(state.played), playing: true });
    }

    const handlePlayPause = () => {
        setVideoProp({...videoProp, playing: !videoRef.current.props.playing });
    }

    const handleClickFullScreen = () => {
        Screenfull.request(findDOMNode(videoRef.current));
    }







    const messageInputKeyDown = (event) => {
        if (event.key === 'Enter') {
            submitMessage();
        }
    };

    const handleMessageInput = (event) => {
        setNewMsg(event.target.value);
    };

    const submitMessage = () => {
        let sender = { username: username, color: color};
        let data = { sender: sender, message: newMsg, room: roomName};
        socket.emit(NEW_MESSAGE, data);
        setNewMsg("");
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };
    
    const handleChangeViewIndex = (index) => {
        setTabValue(index);
    };

    const userNameKeyPress = (event) => {
        if(event.key === 'Enter') {
            socket.emit("change_username", newUserName);
        }
    };

    const handleNewUserNameChange = (event) => {
        setNewUserName(event.target.value);
        
    };

    const renderPlayList = () => {
        if(userRole === "admin") {
            return playlist.map((item, idx) => (
                <ListItem key={idx} onClick={changeCurrentVideo.bind(null, idx)} button>
                    <ListItemText primary={item} />
                    
                    <ListItemSecondaryAction>
                        <IconButton edge="end" color="secondary" aria-label="delete" onClick={removePlaylistItem.bind(null, idx)}>
                            <Delete />
                        </IconButton>
                    </ListItemSecondaryAction>
                </ListItem>
            ));
        } else {
            return playlist.map((item, idx) => (
                <ListItem key={idx}>
                    <ListItemText primary={item} />
                </ListItem>
            ));
        }
    };

    const renderChat = () => {
        return receivedMsg.map(({sender, message}, i) => (
            <ListItem className="message-item" key={i}>
                <span className="sender" style={{ color: sender.color}}>{sender.username}</span>
                <span className="message">{message}</span>
            </ListItem>
        ));
    };

    

    const renderUserList = () => {
        return userlist.map((item, idx) => (
            <ListItem key={idx}>
                <span style={{color: item.color}}> {item.username}</span>
            </ListItem>
        ));
    };

    return (
        <div className ="root">
            <AppBar position="static">
                <Toolbar className="app-header">
                    <Link className="header-home" to={"/"} edge="start">SyncVid</Link>
                    <span className="header-username" edge="end" color="inherit" >Hello! {username}</span>
                </Toolbar>
            </AppBar> 
            <Grid container className="room-container" justify="space-between" alignItems="stretch">
                <Grid item className="video-container">
                    <Grid>
                        <Grid item className="video-wrapper">
                            <ReactPlayer 
                                ref = {videoRef}
                                className="react-player"
                                id="streaming-player"
                                playing = {videoProp.playing}
                                url={videoProp.url}
                                duration={videoProp.duration}
                                width="100%"
                                height="75vh"
                                volume= {videoProp.volume}
                                playing={videoProp.playing} 
                                onEnded = {playNextVideo}
                                onProgress={handleProgress}
                                onPause={handlePlayPause}
                            />
                        </Grid>
                        <Grid item className="common-toolbar">
                            <VolumeUp />
                            <Slider className="volume-slider" defaultValue={30} onChange={handleVolumeChange} aria-labelledby="continuous-slider"/>
                            <IconButton color="default" onClick={handleClickFullScreen}><Fullscreen /></IconButton>
                        </Grid>
                        <Grid item className="admin-toolbar" hidden={userRole !== "admin"}>
                            <Slider className="video-seek-slider" value={videoProp.played*100} onChange={handleSeekChange}/>
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item className="user-control">
                    <Paper className="user-control-container" elevation={1}>
                        <AppBar position="static" color="default" elevation={1}>
                            <Tabs value={tabValue} onChange={handleTabChange}
                                indicatorColor="primary" variant="fullWidth" aria-label="user-control-tabs">
                                <Tab icon={<PlaylistPlay />} aria-label="playlist-container" {...a11yProps(0)}/>
                                <Tab icon={<ChatBubble />} aria-label="chat-container" {...a11yProps(1)}/>
                                <Tab icon={<People />} aria-label="userlist-container" {...a11yProps(2)}/>
                            </Tabs>
                        </AppBar>
                        <SwipeableViews
                            axis={viewTheme.direction === 'rtl' ? 'x-reverse' : 'x'}
                            index={tabValue}
                            onChangeIndex={handleChangeViewIndex}
                            className="user-control-content"
                        >
                            <TabPanel value={tabValue} index={0} className="playlist-container">
                                <Toolbar hidden={userRole !== "admin"} className="add-new-video">
                                    <input className="new-video-url" placeholder="url..." value={newURL} onChange={handleURLChange}/>
                                    <IconButton color="default" onClick={handleURLInput}><AddBox /></IconButton>
                                </Toolbar>
                                <span className="now-playing"> Now Playing <span className="currentUrl">{videoProp.url}</span> </span> 
                                <List dense className="current-playlist">
                                    {renderPlayList()}
                                </List>
                            </TabPanel>
                            <TabPanel value={tabValue} index={1} className="chat-container">
                                <List dense className = "chat-message-list">
                                    {renderChat()}
                                </List>
                                <Toolbar className = "chat-user-input">
                                    <TextField className="username-input"value={newMsg} 
                                        onKeyDown={messageInputKeyDown} onChange = { handleMessageInput } />
                                    <IconButton color="primary" onClick= {submitMessage}><Send /></IconButton>
                                </Toolbar>
                            </TabPanel>
                            <TabPanel value={tabValue} index={2} className="userlist-container">
                                <div className="username-setting">
                                    <Input className="username-input" value={newUserName} onChange={handleNewUserNameChange}
                                        onKeyDown={userNameKeyPress} disableUnderline={true}
                                        startAdornment = {
                                            <InputAdornment position="start">
                                                <AccountCircle />
                                            </InputAdornment>
                                        }
                                    />
                                </div>
                                <List dense className="connected-users">
                                    {renderUserList()}
                                </List>
                            </TabPanel>
                        </SwipeableViews>
                    </Paper>
                </Grid>
            </Grid>
            <footer>
                
            </footer>
        </div>
    );
}

function TabPanel(props) {
    const { children, value, index, ...other } = props;
  
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`full-width-tabpanel-${index}`}
        aria-labelledby={`full-width-tab-${index}`}
        {...other}
      >
        {value === index && (
          <Box p={3}>
            {children}
          </Box>
        )}
      </div>
    );
}
  
  TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.any.isRequired,
    value: PropTypes.any.isRequired,
  };
  
  function a11yProps(index) {
    return {
      id: `full-width-tab-${index}`,
      'aria-controls': `full-width-tabpanel-${index}`,
    };
  }
  

export default StreamingRoom;