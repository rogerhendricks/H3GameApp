import { openDatabase, SQLiteDatabase, enablePromise } from 'react-native-sqlite-storage';
import { Player } from './models/Player';

enablePromise(true);

let db: SQLiteDatabase;

export const openDB = async () => {
  db = await openDatabase({ name: 'H3GameApp.db', location: 'default' });
  await createTables();
};

const createTables = async () => {
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      jerseyNumber INTEGER NOT NULL,
      primaryPosition TEXT NOT NULL,
      secondaryPosition TEXT
    );
  `);
};

export const getPlayers = async (): Promise<Player[]> => {
  const [results] = await db.executeSql('SELECT * FROM players');
  const players: Player[] = [];
  for (let i = 0; i < results.rows.length; i++) {
    players.push(results.rows.item(i));
  }
  return players;
};

export const addPlayerDB = async (player: Player) => {
  await db.executeSql(
    'INSERT INTO players (id, name, jerseyNumber, primaryPosition, secondaryPosition) VALUES (?, ?, ?, ?, ?)',
    [player.id, player.name, player.jerseyNumber, player.primaryPosition, player.secondaryPosition]
  );
};

export const deletePlayerDB = async (id: string) => {
  await db.executeSql('DELETE FROM players WHERE id = ?', [id]);
};

export const updatePlayerDB = async (player: Player): Promise<void> => {
  // const db = await openDB();
  await db.executeSql(
    `UPDATE players SET name = ?, jerseyNumber = ?, primaryPosition = ?, secondaryPosition = ? WHERE id = ?`,
    [player.name, player.jerseyNumber, player.primaryPosition, player.secondaryPosition ?? '', player.id]
  );
};