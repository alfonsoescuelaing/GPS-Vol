import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  Button,
  StyleSheet,
  Alert,
  TextInput,
  AppState,
  Platform,
  Image
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_GATEWAY_URL = 'https://ix64chspak.execute-api.us-east-2.amazonaws.com/datos_reciclaje';
const SECRET_KEY = 'clave_super_segura_2024';

const materiales = {
  'Metales': ['Aluminio', 'Chatarra', 'Perfil', 'Inducido', 'Lamina', 'Cobre', 'Otros'],
  'Papel-Cartón': ['Archivo', 'Cartón', 'Directorio', 'Periódico', 'Plegadiza', 'Tetra Pack', 'Cubeta', 'Otros'],
  'Plásticos': ['Acrílico', 'Galón/Agua', 'Galón/Químico', 'Galón Aceite', 'Plástico R/Elto', 'Plástico Limpio', 'PET Limpio', 'PVC/Blando', 'Canasta', 'Caneca Pintura', 'Otros'],
  'Reuso': ['Otros/Maderables', 'Otros/Metales', 'Otros/Plásticos', 'Otros/Textiles', 'Otros'],
  'Vidrio': ['Casco', 'Champañera', 'Vineras', 'Otros'],
  'Otros': ['RAEES'],
  'Rechazo': ['Rechazo']
};

const camiones = {
  'AEH163': 0.31,
  'AEJ872': 0.48,
  'NHU231': 2.85,
  'RDO737': 4.5,
  'SWK370': 3.5,
  'WCM536': 0.55,
  'WCM607': 0.78,
  'WCM635': 6.5,
  'WEV069': 0.53,
};

export default function App() {
  const [valor, setValor] = useState('');
  const [ubicacion, setUbicacion] = useState(null);
  const [volumenTotal, setVolumenTotal] = useState(0);
  const [claseSeleccionada, setClaseSeleccionada] = useState('');
  const [tipoSeleccionado, setTipoSeleccionado] = useState('');
  const [otroTipo, setOtroTipo] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [tipoAforo, setTipoAforo] = useState("PERMANENTE");
  const [tiposSuscriptor, setTiposSuscriptor] = useState('');
  const [nombreSuscriptor, setNombreSuscriptor] = useState('');
  const [tipoDocumentoSuscriptor, setTipoDocumentoSuscriptor] = useState('');
  const [documentoSuscriptor, setDocumentoSuscriptor] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [frecuencia, setFrecuencia] = useState('');
  const [horario, setHorario] = useState('');
  const [representante, setRepresentante] = useState('');
  const [tipoDocumentoRepresentante, setTipoDocumentoRepresentante] = useState('');
  const [documentoRepresentante, setDocumentoRepresentante] = useState('');
  const [nuis, setNuis] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [placaSeleccionada, setPlacaSeleccionada] = useState('');

  const enviarConUbicacion = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Ubicación no permitida');
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    setUbicacion(loc);
    const timestamp = new Date(Date.now() - 5 * 60 * 60 * 1000);
    const fechaAjustada = timestamp.toISOString().split('T')[0];
    setFecha(fechaAjustada);

    const tipoFinal = tipoSeleccionado === 'Otros' ? otroTipo : tipoSeleccionado;
    const capacidadTon = camiones[placaSeleccionada] ?? 1;
    const porcentaje_carga = valor && capacidadTon ? (parseFloat(valor) / (capacidadTon * 1000)) * 100 : null;

    const payload = {
      latitud: loc.coords.latitude ?? null,
      longitud: loc.coords.longitude ?? null,
      timestamp: timestamp.toISOString(),
      volumen_acumulado: volumenTotal ?? null,
      clase_material: claseSeleccionada || null,
      tipo_material: tipoFinal || null,
      device_id: deviceId || null,
      fecha: fechaAjustada || null,
      tipo_aforo: tipoAforo || null,
      tipo_suscriptor: tiposSuscriptor || null,
      nombre_suscriptor: nombreSuscriptor || null,
      tipo_documento_suscriptor: tipoDocumentoSuscriptor || null,
      documento_suscriptor: documentoSuscriptor || null,
      direccion: direccion || null,
      telefono: telefono || null,
      frecuencia_prestacion: frecuencia || null,
      horario: horario || null,
      representante: representante || null,
      tipo_documento_representante: tipoDocumentoRepresentante || null,
      documento_representante: documentoRepresentante || null,
      nuis: nuis || null,
      placa_camion: placaSeleccionada || null,
      porcentaje_carga: porcentaje_carga?.toFixed(2) || null,
    };

    try {
      await axios.post(API_GATEWAY_URL, { ...payload, key: SECRET_KEY });
      Alert.alert('Volumen enviado correctamente');
    } catch (error) {
      Alert.alert('Error al enviar', error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Image source={require('./assets/logo.png')} style={styles.logo} />
      <Text style={styles.title}>Formulario de Aforo</Text>

      <TextInput style={styles.input} placeholder="Usuario (Device ID)" value={deviceId} onChangeText={setDeviceId} />
      <TextInput style={styles.input} value={fecha} editable={false} />

      <Text style={styles.label}>Tipo de Suscriptor:</Text>
      <Picker selectedValue={tiposSuscriptor} onValueChange={setTiposSuscriptor} style={styles.picker}>
        <Picker.Item label="Seleccione tipo de suscriptor" value="" />
        <Picker.Item label="Gran Productor" value="Gran Productor" />
        <Picker.Item label="Pequeño Productor" value="Pequeño Productor" />
        <Picker.Item label="Residencial" value="Residencial" />
        <Picker.Item label="No Residencial" value="No Residencial" />
        <Picker.Item label="Multiusuario" value="Multiusuario" />
      </Picker>

      <TextInput style={styles.input} placeholder="Nombre del suscriptor" value={nombreSuscriptor} onChangeText={setNombreSuscriptor} />
      <Text style={styles.label}>Tipo de documento del suscriptor:</Text>
      <Picker selectedValue={tipoDocumentoSuscriptor} onValueChange={setTipoDocumentoSuscriptor} style={styles.picker}>
        <Picker.Item label="Seleccione tipo de documento" value="" />
        <Picker.Item label="Cédula de ciudadanía (CC)" value="CC" />
        <Picker.Item label="Cédula de extranjería (CE)" value="CE" />
        <Picker.Item label="NIT" value="NIT" />
      </Picker>
      <TextInput style={styles.input} placeholder="Número de documento del suscriptor" value={documentoSuscriptor} onChangeText={setDocumentoSuscriptor} keyboardType="numeric" />

      <TextInput style={styles.input} placeholder="Dirección" value={direccion} onChangeText={setDireccion} />
      <TextInput style={styles.input} placeholder="Teléfono" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />

      <Text style={styles.label}>Frecuencia del Servicio:</Text>
      <Picker selectedValue={frecuencia} onValueChange={setFrecuencia} style={styles.picker}>
        <Picker.Item label="Seleccione una frecuencia" value="" />
        <Picker.Item label="Semanal" value="Semanal" />
        <Picker.Item label="Quincenal" value="Quincenal" />
        <Picker.Item label="Mensual" value="Mensual" />
        <Picker.Item label="Bimestral" value="Bimestral" />
        <Picker.Item label="Trimestral" value="Trimestral" />
        <Picker.Item label="Semestral" value="Semestral" />
      </Picker>

      <TextInput style={styles.input} placeholder="Horario" value={horario} onChangeText={setHorario} />
      <TextInput style={styles.input} placeholder="Representante o encargado" value={representante} onChangeText={setRepresentante} />
      <Text style={styles.label}>Tipo de documento del representante:</Text>
      <Picker selectedValue={tipoDocumentoRepresentante} onValueChange={setTipoDocumentoRepresentante} style={styles.picker}>
        <Picker.Item label="Seleccione tipo de documento" value="" />
        <Picker.Item label="Cédula de ciudadanía (CC)" value="CC" />
        <Picker.Item label="Cédula de extranjería (CE)" value="CE" />
        <Picker.Item label="NIT" value="NIT" />
      </Picker>
      <TextInput style={styles.input} placeholder="Número de documento del representante" value={documentoRepresentante} onChangeText={setDocumentoRepresentante} keyboardType="numeric" />

      <TextInput style={styles.input} placeholder="NUIS" value={nuis} onChangeText={setNuis} />

      <Text style={styles.label}>Seleccione placa del camión:</Text>
      <Picker
        selectedValue={placaSeleccionada}
        onValueChange={setPlacaSeleccionada}
        style={styles.picker}
      >
        <Picker.Item label="Seleccione una placa" value="" />
        {Object.entries(camiones).map(([placa]) => (
          <Picker.Item key={placa} label={placa} value={placa} />
        ))}
      </Picker>

      <Text style={styles.label}>Clase de material:</Text>
      <Picker selectedValue={claseSeleccionada} onValueChange={setClaseSeleccionada} style={styles.picker}>
        <Picker.Item label="Seleccione clase de material" value="" />
        {Object.keys(materiales).map((clase) => (
          <Picker.Item key={clase} label={clase} value={clase} />
        ))}
      </Picker>

      {claseSeleccionada !== '' && (
        <Picker selectedValue={tipoSeleccionado} onValueChange={setTipoSeleccionado} style={styles.picker}>
          <Picker.Item label="Seleccione tipo de material" value="" />
          {materiales[claseSeleccionada].map((tipo) => (
            <Picker.Item key={tipo} label={tipo} value={tipo} />
          ))}
        </Picker>
      )}

      {tipoSeleccionado === 'Otros' && (
        <TextInput style={styles.input} placeholder="¿Cuál?" value={otroTipo} onChangeText={setOtroTipo} />
      )}

      <Text style={styles.label}>Volumen cargado en kg:</Text>
      <TextInput
        style={styles.input}
        placeholder="Ejemplo: 24.35"
        keyboardType="numeric"
        value={valor}
        onChangeText={setValor}
      />

      <Button title="Enviar" onPress={enviarConUbicacion} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, alignItems: 'center' },
  logo: {
    width: 200,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: { fontSize: 22, marginBottom: 10, fontWeight: 'bold' },
  subtitle: { fontSize: 16, marginBottom: 20 },
  input: {
    width: '80%',
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  picker: {
    width: '80%',
    height: 50,
    marginBottom: 20,
  },
  label: {
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginLeft: '10%',
    marginTop: 10,
  },
  text: { marginTop: 20 },
});
