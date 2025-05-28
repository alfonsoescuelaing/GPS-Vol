import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert, TextInput, AppState, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby-Sm8U49_NkUNn1WhPnwGIvpl-R2-Qq854JyvUVw0YUT3UJ79F8yX1OUMkXIdbq_dgng/exec';
const SECRET_KEY = 'clave_super_segura_2024';

const materiales = {
  'Metales': ['Aluminio', 'Chatarra', 'Perfil', 'Inducido', 'Lamina', 'Cobre', 'Otros'],
  'Papel-Cartón': ['Archivo', 'Cartón', 'Directorio', 'Periódico', 'Plegadiza', 'Tetra Pack', 'Cubeta', 'Otros'],
  'Plásticos': ['Acrílico', 'Galón/Agua', 'Galón/Químico', 'Galón Aceite', 'Plástico R/Elto', 'Plástico Limpio', 'PET_Limpio', 'PVC/Blando', 'Canasta', 'Caneca Pintura', 'Otros'],
  'Reuso': ['Casco', 'Otros/Maderables', 'Otros/Metales', 'Otros/Plásticos', 'Otros/Textiles'],
  'Vidrio': ['Champañera', 'Vineras', 'Otros'],
  'Otros': ['RAEES'],
  'Rechazo': ['Rechazo']
};

export default function App() {
  const [valor, setValor] = useState('');
  const [ubicacion, setUbicacion] = useState(null);
  const [volumenTotal, setVolumenTotal] = useState(0);
  const [claseSeleccionada, setClaseSeleccionada] = useState('');
  const [tipoSeleccionado, setTipoSeleccionado] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'web') {
      cargarVolumenAcumulado();
      sincronizarPendientes();

      const subscription = AppState.addEventListener('change', estado => {
        if (estado === 'active') {
          sincronizarPendientes();
        }
      });

      return () => subscription.remove();
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      enviarAutomaticamente();
    }, 30000);
    return () => clearInterval(interval);
  }, [volumenTotal]);

  const cargarVolumenAcumulado = async () => {
    const valorGuardado = await AsyncStorage.getItem('volumen_acumulado');
    if (valorGuardado) {
      setVolumenTotal(parseInt(valorGuardado));
    }
  };

  const sincronizarPendientes = async () => {
    const pendientes = await AsyncStorage.getItem('pendientes');
    console.log('📦 Pendientes encontrados en AsyncStorage:', pendientes);

    if (!pendientes) {
      console.log('✅ No hay pendientes para sincronizar');
      return;
    }

    const datos = JSON.parse(pendientes);
    const enviados = [];

    for (let i = 0; i < datos.length; i++) {
      const payload = { ...datos[i], key: SECRET_KEY };

      console.log('📤 Payload a reenviar desde AsyncStorage:', payload);

      if (!payload.clase_material || !payload.tipo_material) {
        console.log(`❌ Faltan campos: clase_material=${payload.clase_material}, tipo_material=${payload.tipo_material}`);
      }

      try {
        await axios.post(GOOGLE_SCRIPT_URL, payload);
        enviados.push(i);
      } catch (err) {
        console.log('❌ Fallo al reenviar pendiente:', datos[i]);
      }
    }

    const restantes = datos.filter((_, i) => !enviados.includes(i));
    await AsyncStorage.setItem('pendientes', JSON.stringify(restantes));
  };

  const sumarYEnviar = async () => {
    if (!claseSeleccionada || !tipoSeleccionado) {
      Alert.alert('Faltan datos', 'Seleccione clase y tipo de material');
      return;
    }

    if (!valor || isNaN(parseInt(valor)) || parseInt(valor) <= 0) {
      Alert.alert('Error', 'Ingrese un número entero positivo');
      return;
    }

    const incremento = parseInt(valor);
    const nuevoTotal = volumenTotal + incremento;
    await AsyncStorage.setItem('volumen_acumulado', nuevoTotal.toString());
    setVolumenTotal(nuevoTotal);
    setValor('');
    await enviarConUbicacion(nuevoTotal);
  };

  const enviarAutomaticamente = async () => {
    if (volumenTotal > 0) {
      await enviarConUbicacion(volumenTotal, false);
    }
  };

  const enviarConUbicacion = async (volumen, notificar = true) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      if (notificar) Alert.alert('Permiso denegado', 'Ubicación no permitida');
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    setUbicacion(loc);

    const payload = {
      latitud: loc.coords.latitude,
      longitud: loc.coords.longitude,
      timestamp: new Date().toISOString(),
      valor_entero: volumen,
      clase_material: claseSeleccionada,
      tipo_material: tipoSeleccionado,
      device_id: 'usuario123',
    };

    console.log('📤 Payload a enviar desde enviarConUbicacion:', payload);

    try {
      await axios.post(GOOGLE_SCRIPT_URL, { ...payload, key: SECRET_KEY });
      if (notificar) Alert.alert('Volumen enviado correctamente');
    } catch (error) {
      const pendientes = await AsyncStorage.getItem('pendientes');
      const lista = pendientes ? JSON.parse(pendientes) : [];
      lista.push(payload);
      await AsyncStorage.setItem('pendientes', JSON.stringify(lista));
      if (notificar) Alert.alert('Guardado localmente', 'Se enviará cuando haya conexión');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registro de Volumen Acumulado</Text>
      <Text style={styles.subtitle}>Volumen actual: {volumenTotal} unidades</Text>

      <Picker
        selectedValue={claseSeleccionada}
        onValueChange={(itemValue) => {
          setClaseSeleccionada(itemValue);
          setTipoSeleccionado('');
        }}
        style={styles.picker}
      >
        <Picker.Item label="Seleccione clase de material" value="" />
        {Object.keys(materiales).map((clase) => (
          <Picker.Item key={clase} label={clase} value={clase} />
        ))}
      </Picker>

      {claseSeleccionada !== '' && (
        <Picker
          selectedValue={tipoSeleccionado}
          onValueChange={setTipoSeleccionado}
          style={styles.picker}
        >
          <Picker.Item label="Seleccione tipo de material" value="" />
          {materiales[claseSeleccionada].map((tipo) => (
            <Picker.Item key={tipo} label={tipo} value={tipo} />
          ))}
        </Picker>
      )}

      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="Ingrese nuevo volumen cargado"
        value={valor}
        onChangeText={setValor}
      />

      <Button title="Agregar volumen y enviar" onPress={sumarYEnviar} />
      <View style={{ marginTop: 10 }}>
        <Button title="Forzar sincronización" onPress={sincronizarPendientes} />
      </View>

      {ubicacion && (
        <Text style={styles.text}>
          Lat: {ubicacion.coords.latitude}, Lon: {ubicacion.coords.longitude}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  title: { fontSize: 22, marginBottom: 10, fontWeight: 'bold' },
  subtitle: { fontSize: 16, marginBottom: 20 },
  input: {
    width: '80%',
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  picker: {
    width: '80%',
    height: 50,
    marginBottom: 20,
  },
  text: { marginTop: 20 },
});
