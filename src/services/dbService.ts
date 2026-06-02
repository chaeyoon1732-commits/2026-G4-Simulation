import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  getDoc,
  getDocFromServer
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Persona, Scenario, SimulationRecord } from '../types';
import { PERSONAS, SCENARIOS } from '../constants';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';

const PERSONAS_COL = 'personas';
const SCENARIOS_COL = 'scenarios';
const SIMULATIONS_COL = 'simulations';

export const dbService = {
  // Validate Connection
  async testConnection() {
    try {
      // attempt to get a document from the server to verify connection
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error: any) {
      console.error("Firestore connectivity error:", error);
      if (error?.message?.includes('Could not reach Cloud Firestore backend') || error?.code === 'unavailable') {
        alert('Firestore 서버에 연결할 수 없습니다.\n\nFirebase 콘솔에서 Firestore가 활성화되어 있는지, 그리고 사용 가능한 상태인지 확인해주세요.\n\n프로젝트 ID: g4-simulation');
      } else if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      }
    }
  },

  // Sync initial data if empty
  async syncInitialData() {
    try {
      const personasSnapshot = await getDocs(collection(db, PERSONAS_COL));
      if (personasSnapshot.empty) {
        console.log('Seeding initial personas...');
        for (const p of PERSONAS) {
          await setDoc(doc(db, PERSONAS_COL, p.id), p);
        }
      }

      const scenariosSnapshot = await getDocs(collection(db, SCENARIOS_COL));
      if (scenariosSnapshot.empty) {
        console.log('Seeding initial scenarios...');
        for (const s of SCENARIOS) {
          await setDoc(doc(db, SCENARIOS_COL, s.id), s);
        }
      }
    } catch (error) {
      // Silently fail seeding if permissions are missing (e.g. non-admin or not logged in)
      console.warn('Seeding skipped or failed:', error instanceof Error ? error.message : String(error));
    }
  },

  // Personas
  async getPersonas(): Promise<Persona[]> {
    try {
      const snapshot = await getDocs(collection(db, PERSONAS_COL));
      if (snapshot.empty) return PERSONAS;
      return snapshot.docs.map(doc => doc.data() as Persona);
    } catch (error) {
      console.warn('Personas fetch failed, using local data:', error);
      return PERSONAS;
    }
  },

  async savePersona(persona: Persona) {
    try {
      await setDoc(doc(db, PERSONAS_COL, persona.id), persona);
    } catch (error) {
      handleFirestoreError(error, OperationType.SAVE, `${PERSONAS_COL}/${persona.id}`);
    }
  },

  async deletePersona(id: string) {
    try {
      await deleteDoc(doc(db, PERSONAS_COL, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${PERSONAS_COL}/${id}`);
    }
  },

  // Scenarios
  async getScenarios(): Promise<Scenario[]> {
    try {
      const snapshot = await getDocs(collection(db, SCENARIOS_COL));
      if (snapshot.empty) return SCENARIOS;
      return snapshot.docs.map(doc => doc.data() as Scenario);
    } catch (error) {
      console.warn('Scenarios fetch failed, using local data:', error);
      return SCENARIOS;
    }
  },

  async saveScenario(scenario: Scenario) {
    try {
      await setDoc(doc(db, SCENARIOS_COL, scenario.id), scenario);
    } catch (error) {
      handleFirestoreError(error, OperationType.SAVE, `${SCENARIOS_COL}/${scenario.id}`);
    }
  },

  async deleteScenario(id: string) {
    try {
      await deleteDoc(doc(db, SCENARIOS_COL, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${SCENARIOS_COL}/${id}`);
    }
  },

  // Simulations
  async saveSimulation(record: Omit<SimulationRecord, 'timestamp'>) {
    try {
      console.log('[dbService] Saving simulation record for:', record.userEmail);
      // Remove any pre-existing timestamp to avoid conflicts with serverTimestamp
      const { timestamp: _, ...cleanRecord } = record as any;
      const docRef = await addDoc(collection(db, SIMULATIONS_COL), {
        ...cleanRecord,
        timestamp: serverTimestamp()
      });
      console.log('[dbService] Record saved successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('[dbService] Save simulation error:', error);
      handleFirestoreError(error, OperationType.CREATE, SIMULATIONS_COL);
      throw error;
    }
  },

  async getSimulations(): Promise<SimulationRecord[]> {
    try {
      const q = query(collection(db, SIMULATIONS_COL), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SimulationRecord));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, SIMULATIONS_COL);
      return [];
    }
  },

  async deleteSimulation(id: string) {
    try {
      console.log(`Attempting to delete simulation with ID: ${id}`);
      if (!id) throw new Error('Simulation ID is missing');
      await deleteDoc(doc(db, SIMULATIONS_COL, id));
      console.log(`Successfully deleted simulation ${id} from Firebase.`);
    } catch (error) {
      console.error(`Error deleting simulation ${id}:`, error);
      handleFirestoreError(error, OperationType.DELETE, `${SIMULATIONS_COL}/${id}`);
    }
  },

  async deleteAllSimulations() {
    try {
      const snapshot = await getDocs(collection(db, SIMULATIONS_COL));
      const deletePromises = snapshot.docs.map(document => deleteDoc(doc(db, SIMULATIONS_COL, document.id)));
      await Promise.all(deletePromises);
      console.log(`Deleted ${snapshot.size} simulations from Firebase.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, SIMULATIONS_COL);
    }
  }
};
