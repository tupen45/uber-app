

import React, { useEffect, useState,useRef } from 'react';
import type {PropsWithChildren} from 'react';
import {StyleSheet, Text, Alert,View, Image,TouchableOpacity,Modal,TextInput} from 'react-native';
import Mapbox,{ Annotation, MapView, MarkerView, PointAnnotation } from "@rnmapbox/maps";
import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';


Mapbox.setAccessToken("pk.eyJ1IjoidHVwZW5zaGlsIiwiYSI6ImNtMTY3cnhhMTBld3Qya3F6cm03NmY2ZWkifQ.ausl3nT6lts58887HqVYVA");


// Mapbox.setConnected(true);




function App(): React.JSX.Element {
  // Mapbox.setTelemetryEnabled(false);
  const [currentPosition, setCurrentPosition] = useState<{ latitude: number | null; longitude: number | null ; heading : number | null }>({ latitude: null, longitude: null , heading: null});
  const [users, setUsers] = useState<{ id: string; latitude: number; longitude: number ; heading: number }[]>([]);
  const [popupVisible, setPopupVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; latitude: number; longitude: number } | null>(null);
  const [message, setMessage] = useState('');
  const [receivedMessages, setReceivedMessages] = useState<{ from: string; message: string }[]>([]);
  const [incomingMessageVisible, setIncomingMessageVisible] = useState(false);

 

  // let ws: WebSocket;
  const ws = useRef<WebSocket | null>(null);
  console.log(users)



  useEffect(() => {
    const requestLocationPermission = async () => {
      if (Platform.OS === 'ios') {
        Geolocation.requestAuthorization('whenInUse');
      } else {
        try {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('Error', 'Location permission denied');
            return;
          }
        } catch (err) {
          console.warn(err);
        }
      }
      startLocationTracking();
    };

    const startLocationTracking = () => {
      Geolocation.watchPosition(
        (position) => {
          const { latitude, longitude,heading } = position.coords;
          // console.log(position.coords)
          setCurrentPosition({ latitude, longitude ,heading});
          sendLocationToServer({ latitude, longitude,heading });
        },
        (error) => {
          console.log(error);
          Alert.alert('Error', 'Unable to fetch location');
        },
        { enableHighAccuracy: true, distanceFilter: 10, interval: 1000 }
      );
    };

    const sendLocationToServer = ({ latitude, longitude,heading }: { latitude: number; longitude: number; heading:number }) => {
      if (ws.current) { // Check if the WebSocket is initialized
        ws.current.send(JSON.stringify({ id:'tupen', latitude, longitude, heading })); // Replace 'userId' with a unique identifier for the user
      } else {
        console.error('WebSocket not connected'); // Optional: Log an error if WebSocket is not initialized
      }
    };
    

    const setupWebSocket = () => {
      ws.current = new WebSocket('ws://192.168.110.11:8080');
    
      ws.current.onopen = () => {
        console.log('WebSocket connected');
      };
    
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
    
          // Check if the message is a chat message
          if (data.message) {
            // Add the chat message to receivedMessages state
            
            setReceivedMessages((prevMessages) => [
              ...prevMessages,
              { from: data.from, message: data.message },
            ]);
          } else {
            // Handle user updates
            setUsers((prevUsers) => {
              
              const existingUser = prevUsers.find(user => user.id === data.id);
              if (existingUser) {
                return prevUsers.map(user => user.id === data.id ? data : user);
              } else {
                return [...prevUsers, data];
              }
            });
          }
        } catch (error) {
          console.error('Failed to parse message:', event.data);
          console.error('Error:', error);
        }
      };
    
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    
      ws.current.onclose = () => {
        console.log('WebSocket closed');
      };
    };
    
    
    requestLocationPermission();
    setupWebSocket();

    return () => {
      if (ws) {
        ws.current?.CLOSED
      }
    };
  }, []);



  const handleMarkerPress = (user) => {
    setSelectedUser(user);
    
    setPopupVisible(true);
  };
 
  const closeModal = () => {
    setPopupVisible(false);
    setSelectedUser(null);
    setMessage('');
  };
 

  const sendMessage = () => {
    console.log('sendMessage called');
  
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }
  
    if (ws.current && selectedUser && ws.current.readyState === WebSocket.OPEN) {
      const messageToSend = { 
        to: selectedUser.id, 
        from: 'tupen', 
        message: message 
      };
      console.log('Sending message:', messageToSend);
      ws.current.send(JSON.stringify(messageToSend));
      setMessage(''); // Clear the input
      closeModal(); // Close the modal
    } else {
      console.error('WebSocket state:', ws.current ? ws.current.readyState : 'WebSocket not initialized');
      Alert.alert('Error', 'WebSocket not connected or no user selected');
    }
  };
  

  
 
  return (
    <View style={{ flex: 1 }}>
  <MapView  style={styles.map}>
    <Mapbox.Camera
    centerCoordinate={[25.7400162, 88.2545807]}
   
    zoomLevel={5}
   
    
  
    >

      
    </Mapbox.Camera>
    {currentPosition.latitude && currentPosition.longitude ? (
        <MarkerView coordinate={[currentPosition.longitude, currentPosition.latitude, currentPosition.heading]} >
           <TouchableOpacity onPress={() => handleMarkerPress({ id: 'tupen', latitude: currentPosition.latitude, longitude: currentPosition.longitude ,heading:currentPosition.heading})}>
              <View style={styles.marker}>
                <Image source={require('./photo/cr.png')} style={[styles.markerIcon,{transform :[{rotate: `${currentPosition.heading}deg`}]} ]} />
              </View>
            </TouchableOpacity>
      </MarkerView>
      ) : null}
       {users.map(user => (
        <MarkerView key={user.id} coordinate={[user.longitude, user.latitude, user.heading]}>
          <TouchableOpacity onPress={() => handleMarkerPress(user)}>
              <View style={styles.marker}>
                <Image source={require('./photo/cr.png')} style={[styles.markerIcon,{transform: [{rotate: `${user.heading}deg`}]  }]} />
              </View>
            </TouchableOpacity>
        </MarkerView>
      ))}
   </MapView>
   <Modal
        visible={popupVisible}
        transparent={true}
        animationType='fade'
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedUser && (
              <>
                <Text style={styles.modalText}>driver name: {selectedUser.id}</Text>
                {/* <Text style={styles.modalText}>Latitude: {selectedUser.latitude}</Text>
                <Text style={styles.modalText}>Longitude: {selectedUser.longitude}</Text> */}
                <TextInput
                  style={styles.input}
                  placeholder="Type your message here..."
                  value={message}
                  onChangeText={setMessage}
                />
                <TouchableOpacity  onPress={() => {
    console.log('About to send message:', selectedUser);
    sendMessage();
  }}  style={styles.sendButton}>
                  <Text style={styles.sendButtonText}>Send Message</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
  visible={incomingMessageVisible}
  transparent={true}
  animationType='fade'
  onRequestClose={() => {
    setIncomingMessageVisible(false);
    setReceivedMessages(null);
  }}
>
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
      {receivedMessages && (
        <>
          <Text style={styles.modalText}>From: {receivedMessages.from}</Text>
          <Text style={styles.modalText}>Message: {receivedMessages.message}</Text>
          <TouchableOpacity onPress={() => {
            setIncomingMessageVisible(false);
            setReceivedMessages(null);
          }} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  </View>
</Modal>

   
 </View>
 


);
}

const styles = StyleSheet.create({
  map: {
    flex: 1
  },
  marker: {
    alignItems: 'center',
    justifyContent: 'center',
    width:80,
    
    

    // backgroundColor: 'red',
    // borderRadius: 20,
    // padding: 5,
    // elevation: 3,
    // fontSize:60 // for Android shadow
  },
  markerText: {
    fontSize: 50, // Adjust the size as needed
    tintColor:'red',
    color:'red'
  },
  markerIcon: {
    width: 80, // Adjust icon size as needed
    height: 80,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: 300,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 18,
    marginBottom: 10,
  },
  closeButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#007BFF',
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'white',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    width: '100%',
  },
  sendButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#007BFF',
    borderRadius: 5,
  },
  sendButtonText: {
    color: 'white',
  },
 
  
});

export default App;


