import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Keyboard,
} from 'react-native';

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

//////////////////// LOGIN ////////////////////

function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async (type) => {
    if (!email || !password) return alert('Enter email & password');

    try {
      if (type === 'login') {
        await auth().signInWithEmailAndPassword(email, password);
      } else {
        await auth().createUserWithEmailAndPassword(email, password);
      }
      navigation.replace('Home');
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Expense Tracker 💰</Text>

      <TextInput
        placeholder="Email"
        style={styles.input}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder="Password"
        style={styles.input}
        secureTextEntry
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.btn} onPress={() => handleAuth('login')}>
        <Text style={styles.btnText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btn2} onPress={() => handleAuth('signup')}>
        <Text style={styles.btnText}>Signup</Text>
      </TouchableOpacity>
    </View>
  );
}

//////////////////// HOME ////////////////////

function HomeScreen() {
  const user = auth().currentUser;

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState(null);

  const listRef = useRef(null);

  // ✅ ADD
  const addExpense = async () => {
    if (!amount || !note) return alert('Fill all fields');

    await firestore().collection('expenses').add({
      amount: Number(amount),
      note,
      userId: user.uid,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

    setAmount('');
    setNote('');
    Keyboard.dismiss();
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // ✅ UPDATE
  const updateExpense = async () => {
    if (!amount || !note) return alert('Fill all fields');

    await firestore().collection('expenses').doc(editingId).update({
      amount: Number(amount),
      note,
    });

    setEditingId(null);
    setAmount('');
    setNote('');
    Keyboard.dismiss();
  };

  // ✅ DELETE
  const deleteExpense = async (id) => {
    await firestore().collection('expenses').doc(id).delete();
  };

  // ✅ FETCH
  useEffect(() => {
    if (!user?.uid) return;

    const sub = firestore()
      .collection('expenses')
      .where('userId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .onSnapshot((snapshot) => {
        const list = [];
        let sum = 0;

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (!data.createdAt) return;

          list.push({ id: doc.id, ...data });
          sum += data.amount || 0;
        });

        setExpenses(list);
        setTotal(sum);
        setLoading(false);
      });

    return () => sub();
  }, [user]);

  if (loading) return <ActivityIndicator size="large" />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Welcome {user?.email}</Text>

      <Text style={styles.total}>Total: ₹ {total}</Text>

      <TextInput
        placeholder="Amount"
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />

      <TextInput
        placeholder="Note"
        style={styles.input}
        value={note}
        onChangeText={setNote}
      />

      <TouchableOpacity
        style={styles.btn}
        onPress={editingId ? updateExpense : addExpense}
      >
        <Text style={styles.btnText}>
          {editingId ? 'Update Expense' : 'Add Expense'}
        </Text>
      </TouchableOpacity>

      {editingId && (
        <TouchableOpacity
          onPress={() => {
            setEditingId(null);
            setAmount('');
            setNote('');
          }}
        >
          <Text style={{ color: 'red', textAlign: 'center', marginTop: 10 }}>
            Cancel Edit
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={listRef}
        data={expenses}
        extraData={expenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={<Text>No expenses yet</Text>}
        ListFooterComponent={
          <TouchableOpacity onPress={() => auth().signOut()}>
            <Text style={{ textAlign: 'center', margin: 20, color: 'red' }}>
              Logout
            </Text>
          </TouchableOpacity>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.amount}>₹ {item.amount}</Text>
            <Text>{item.note}</Text>

            <Text style={styles.date}>
              {item.createdAt?.toDate
                ? new Date(item.createdAt.toDate()).toLocaleDateString()
                : ''}
            </Text>

            <TouchableOpacity onPress={() => deleteExpense(item.id)}>
              <Text style={styles.delete}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setEditingId(item.id);
                setAmount(item.amount.toString());
                setNote(item.note);
              }}
            >
              <Text style={{ color: 'blue', marginTop: 5 }}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

//////////////////// APP ////////////////////

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const sub = auth().onAuthStateChanged(setUser);
    return sub;
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

//////////////////// STYLES ////////////////////

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },

  title: { fontSize: 26, textAlign: 'center', marginBottom: 20 },

  header: { fontSize: 18, marginBottom: 10 },

  total: { fontSize: 20, fontWeight: 'bold', color: 'green' },

  input: {
    borderWidth: 1,
    marginVertical: 8,
    padding: 10,
    borderRadius: 8,
  },

  btn: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },

  btn2: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },

  btnText: { color: '#fff', textAlign: 'center' },

  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    elevation: 3,
  },

  amount: { fontSize: 18, fontWeight: 'bold' },

  date: { fontSize: 12, color: 'gray' },

  delete: { color: 'red', marginTop: 5 },
});

export default App;