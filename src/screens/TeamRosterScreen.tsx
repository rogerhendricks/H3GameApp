import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { Player } from '../models/Player';
  import { getPlayers, addPlayerDB, deletePlayerDB, updatePlayerDB } from '../database';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { AppTheme } from '../theme';

type RootStackParamList = {
  TeamRoster: undefined;
  GameDay: undefined;
};

type RootTabParamList = {
  Roster: undefined;
  'Game Day': undefined;
};

type TeamRosterScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList, 'TeamRoster'>,
  BottomTabNavigationProp<RootTabParamList>
>;

// ── Position data ─────────────────────────────────────────────────────────────

type PositionOption = { label: string; value: string; description: string };
type PositionCategory = { category: string; positions: PositionOption[] };

const POSITION_OPTIONS: PositionCategory[] = [
  {
    category: 'Goalkeeper',
    positions: [
      { label: 'GK', value: 'GK', description: 'Goalkeeper' },
    ],
  },
  {
    category: 'Defenders',
    positions: [
      { label: 'CB',  value: 'CB',  description: 'Center Back' },
      { label: 'RB',  value: 'RB',  description: 'Right Back' },
      { label: 'LB',  value: 'LB',  description: 'Left Back' },
    ],
  },
  {
    category: 'Midfielders',
    positions: [
      { label: 'CDM', value: 'CDM', description: 'Defensive Midfielder' },
      { label: 'CM',  value: 'CM',  description: 'Central Midfielder' },
      { label: 'CAM', value: 'CAM', description: 'Attacking Midfielder' },
      { label: 'RAM', value: 'RAM', description: 'Right Attacking Midfielder' },
      { label: 'LAM', value: 'LAM', description: 'Left Attacking Midfielder' },
      { label: 'RM',  value: 'RM',  description: 'Right Midfielder' },
      { label: 'LM',  value: 'LM',  description: 'Left Midfielder' },
    ],
  },
  {
    category: 'Forwards',
    positions: [
      { label: 'ST', value: 'ST', description: 'Striker' },
      { label: 'RW', value: 'RW', description: 'Right Winger' },
      { label: 'LW', value: 'LW', description: 'Left Winger' },
      { label: 'CF', value: 'CF', description: 'Center Forward' },
    ],
  },
];

const ALL_POSITIONS: PositionOption[] = POSITION_OPTIONS.flatMap(c => c.positions);

// ── PositionPicker ─────────────────────────────────────────────────────────────

interface PositionPickerProps {
  value: string;
  onSelect: (value: string) => void;
  placeholder: string;
  optional?: boolean;
}

const PositionPicker = ({ value, onSelect, placeholder, optional = false }: PositionPickerProps) => {
  const { theme } = useTheme();
  const pickerStyles = useMemo(() => makePickerStyles(theme), [theme]);
  const [visible, setVisible] = useState(false);
  const selected = ALL_POSITIONS.find(p => p.value === value);

  return (
    <>
      <TouchableOpacity
        style={pickerStyles.trigger}
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={placeholder}
      >
        <Text style={[pickerStyles.triggerText, !value && pickerStyles.triggerPlaceholder]}>
          {value ? `${value}  –  ${selected?.description ?? value}` : placeholder}
        </Text>
        <Icon name="chevron-down" size={16} color={theme.colors.border} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={() => setVisible(false)}
      >
        <View style={pickerStyles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} />
          <View style={pickerStyles.sheet}>
            <View style={pickerStyles.sheetHandle} />
            <Text style={pickerStyles.sheetTitle}>{placeholder}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {optional && (
                <TouchableOpacity
                  style={[pickerStyles.optionRow, value === '' && pickerStyles.optionRowSelected]}
                  onPress={() => { onSelect(''); setVisible(false); }}
                  accessibilityRole="button"
                  accessibilityLabel="None — clear selection"
                >
                  <Text style={[pickerStyles.optionLabel, value === '' && pickerStyles.optionLabelSelected]}>—</Text>
                  <Text style={[pickerStyles.optionDesc, value === '' && pickerStyles.optionDescSelected]}>
                    None (clear selection)
                  </Text>
                  {value === '' && <Icon name="checkmark" size={16} color={theme.colors.primary} />}
                </TouchableOpacity>
              )}
              {POSITION_OPTIONS.map(cat => (
                <View key={cat.category}>
                  <Text style={pickerStyles.categoryHeader}>{cat.category}</Text>
                  {cat.positions.map(pos => (
                    <TouchableOpacity
                      key={pos.value}
                      style={[
                        pickerStyles.optionRow,
                        value === pos.value && pickerStyles.optionRowSelected,
                      ]}
                      onPress={() => { onSelect(pos.value); setVisible(false); }}
                      accessibilityRole="button"
                      accessibilityLabel={`${pos.label} — ${pos.description}`}
                    >
                      <Text style={[pickerStyles.optionLabel, value === pos.value && pickerStyles.optionLabelSelected]}>
                        {pos.label}
                      </Text>
                      <Text style={[pickerStyles.optionDesc, value === pos.value && pickerStyles.optionDescSelected]}>
                        {pos.description}
                      </Text>
                      {value === pos.value && <Icon name="checkmark" size={16} color={theme.colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const makePickerStyles = (t: AppTheme) => StyleSheet.create({
  trigger: {
    height: 42,
    borderColor: t.colors.border,
    borderWidth: 1,
    marginBottom: t.spacing.sm,
    paddingHorizontal: t.spacing.sm,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: t.colors.background,
  },
  triggerText: {
    fontSize: 15,
    color: t.colors.text,
    flex: 1,
  },
  triggerPlaceholder: {
    color: t.colors.border,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: t.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: t.spacing.md,
    paddingBottom: t.spacing.xl,
    maxHeight: '75%',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: t.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: t.spacing.md,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: t.colors.text,
    marginBottom: t.spacing.sm,
  },
  categoryHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: t.colors.text,
    opacity: 0.4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: t.spacing.sm,
    paddingTop: t.spacing.sm,
    paddingBottom: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 12,
    borderRadius: 8,
    gap: t.spacing.sm,
  },
  optionRowSelected: {
    backgroundColor: `${t.colors.primary}18`,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: t.colors.text,
    minWidth: 44,
  },
  optionLabelSelected: {
    color: t.colors.primary,
  },
  optionDesc: {
    fontSize: 14,
    color: t.colors.text,
    opacity: 0.6,
    flex: 1,
  },
  optionDescSelected: {
    color: t.colors.primary,
    opacity: 0.85,
  },
});

// ── Defined outside the component so it is never recreated on re-render ──
const EmptyRoster = () => {
  const { theme } = useTheme();
  return (
    <View style={{ alignItems: 'center', marginTop: theme.spacing.xl, paddingHorizontal: theme.spacing.lg }}>
      <Icon name="people-outline" size={52} color={theme.colors.border} />
      <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text, marginTop: theme.spacing.md }}>
        No players yet
      </Text>
      <Text style={{ fontSize: 14, color: theme.colors.text, opacity: 0.5, marginTop: theme.spacing.xs, textAlign: 'center' }}>
        Fill in the form above to add your first player.
      </Text>
    </View>
  );
};

const TeamRosterScreen = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const navigation = useNavigation<TeamRosterScreenNavigationProp>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [primaryPosition, setPrimaryPosition] = useState('');
  const [secondaryPosition, setSecondaryPosition] = useState('');

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editName, setEditName] = useState('');
  const [editJerseyNumber, setEditJerseyNumber] = useState('');
  const [editPrimaryPosition, setEditPrimaryPosition] = useState('');
  const [editSecondaryPosition, setEditSecondaryPosition] = useState('');

  const loadPlayers = useCallback(async () => {
    try {
      const storedPlayers = await getPlayers();
      setPlayers(storedPlayers);
    } catch (error) {
      console.error('Failed to load players', error);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadPlayers();
    });
    return unsubscribe;
  }, [navigation, loadPlayers]);

  const addPlayer = async () => {
    const trimmedName = name.trim();
    const trimmedJersey = jerseyNumber.trim();
    const trimmedPrimary = primaryPosition.trim();

    if (!trimmedName || !trimmedJersey || !trimmedPrimary) return;

    // Bug fix: use a collision-safe ID
    const newPlayer: Player = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: trimmedName,
      jerseyNumber: parseInt(trimmedJersey, 10),
      primaryPosition: trimmedPrimary,
      // Bug fix: store undefined instead of '' for optional field
      secondaryPosition: secondaryPosition.trim() || undefined,
    };
    await addPlayerDB(newPlayer);
    await loadPlayers();
    setName('');
    setJerseyNumber('');
    setPrimaryPosition('');
    setSecondaryPosition('');
  };

  const confirmDeletePlayer = (player: Player) => {
    Alert.alert(
      'Remove Player',
      `Remove ${player.name} from the roster?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await deletePlayerDB(player.id);
            await loadPlayers();
          },
        },
      ],
    );
  };

  const openEditModal = (player: Player) => {
    setEditingPlayer(player);
    setEditName(player.name);
    setEditJerseyNumber(player.jerseyNumber.toString());
    setEditPrimaryPosition(player.primaryPosition);
    setEditSecondaryPosition(player.secondaryPosition ?? '');
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingPlayer(null);
  };

  const saveEdit = async () => {
    const trimmedName = editName.trim();
    const trimmedJersey = editJerseyNumber.trim();
    const trimmedPrimary = editPrimaryPosition.trim();

    if (!editingPlayer || !trimmedName || !trimmedJersey || !trimmedPrimary) return;

    const updatedPlayer: Player = {
      ...editingPlayer,
      name: trimmedName,
      jerseyNumber: parseInt(trimmedJersey, 10),
      primaryPosition: trimmedPrimary,
      secondaryPosition: editSecondaryPosition.trim() || undefined,
    };
    await updatePlayerDB(updatedPlayer);
    await loadPlayers();
    closeEditModal();
  };

  const canAdd = name.trim() && jerseyNumber.trim() && primaryPosition.trim();

  return (
    // Keyboard avoidance for the add-player form on the main screen
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>

        {/* ── Add Player Form ── */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Add New Player</Text>

          <Text style={styles.inputLabel}>Player Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Marcus Rashford"
            value={name}
            onChangeText={setName}
            placeholderTextColor={theme.colors.border}
            returnKeyType="next"
          />

          <Text style={styles.inputLabel}>Jersey Number <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 10"
            value={jerseyNumber}
            onChangeText={setJerseyNumber}
            keyboardType="numeric"
            placeholderTextColor={theme.colors.border}
            returnKeyType="next"
          />

          <Text style={styles.inputLabel}>Primary Position <Text style={styles.required}>*</Text></Text>
          <PositionPicker
            value={primaryPosition}
            onSelect={setPrimaryPosition}
            placeholder="Select primary position"
          />

          <Text style={styles.inputLabel}>Secondary Position <Text style={styles.optional}>(optional)</Text></Text>
          <PositionPicker
            value={secondaryPosition}
            onSelect={setSecondaryPosition}
            placeholder="Select secondary position"
            optional
          />

          <TouchableOpacity
            style={[styles.addButton, !canAdd && styles.addButtonDisabled]}
            onPress={addPlayer}
            disabled={!canAdd}
            accessibilityRole="button"
            accessibilityLabel="Add player to roster"
          >
            <Icon name="person-add-outline" size={16} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Player</Text>
          </TouchableOpacity>
        </View>

        {/* ── Roster List ── */}
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderText}>
            {players.length} {players.length === 1 ? 'Player' : 'Players'}
          </Text>
        </View>

        {/* Bug fix: keyboardShouldPersistTaps so tapping a row while keyboard is open works */}
        <FlatList
          data={players}
          keyExtractor={item => item.id}
          ListEmptyComponent={EmptyRoster}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <View
              style={[
                styles.playerItem,
                index === 0 && styles.playerItemFirst,
                index === players.length - 1 && styles.playerItemLast,
              ]}
            >
              {/* Jersey badge */}
              <View style={styles.jerseyBadge}>
                <Text style={styles.jerseyBadgeText}>#{item.jerseyNumber}</Text>
              </View>

              {/* Name + positions */}
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{item.name}</Text>
                <Text style={styles.playerPosition}>
                  {item.primaryPosition}
                  {item.secondaryPosition ? ` · ${item.secondaryPosition}` : ''}
                </Text>
              </View>

              {/* Actions */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={() => openEditModal(item)}
                  style={styles.iconButton}
                  accessibilityLabel={`Edit ${item.name}`}
                  accessibilityRole="button"
                >
                  <Icon name="pencil-outline" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => confirmDeletePlayer(item)}
                  style={styles.iconButton}
                  accessibilityLabel={`Delete ${item.name}`}
                  accessibilityRole="button"
                >
                  <Icon name="trash-outline" size={20} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />

        {/* ── Edit Player Bottom Sheet Modal ── */}
        <Modal
          visible={editModalVisible}
          animationType="slide"
          transparent
          onRequestClose={closeEditModal}
        >
          {/*
            Bug fix: KAV wraps everything with flex:1 + justifyContent:'flex-end'.
            Pressable uses absoluteFill so it covers the backdrop without consuming
            layout space — previously it had flex:1 which collapsed the KAV to zero height.
          */}
          <KeyboardAvoidingView
            style={styles.modalRoot}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeEditModal} />

            <View style={styles.modalContainer}>
              <View style={styles.dragHandle} />
              <Text style={styles.modalTitle}>Edit Player</Text>

              <Text style={styles.inputLabel}>Player Name <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="Player Name"
                value={editName}
                onChangeText={setEditName}
                placeholderTextColor={theme.colors.border}
              />

              <Text style={styles.inputLabel}>Jersey Number <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="Jersey Number"
                value={editJerseyNumber}
                onChangeText={setEditJerseyNumber}
                keyboardType="numeric"
                placeholderTextColor={theme.colors.border}
              />

              <Text style={styles.inputLabel}>Primary Position <Text style={styles.required}>*</Text></Text>
              <PositionPicker
                value={editPrimaryPosition}
                onSelect={setEditPrimaryPosition}
                placeholder="Select primary position"
              />

              <Text style={styles.inputLabel}>Secondary Position <Text style={styles.optional}>(optional)</Text></Text>
              <PositionPicker
                value={editSecondaryPosition}
                onSelect={setEditSecondaryPosition}
                placeholder="Select secondary position"
                optional
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={closeEditModal}
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.saveButton,
                    (!editName.trim() || !editJerseyNumber.trim() || !editPrimaryPosition.trim()) &&
                      styles.saveButtonDisabled,
                  ]}
                  onPress={saveEdit}
                  disabled={!editName.trim() || !editJerseyNumber.trim() || !editPrimaryPosition.trim()}
                  accessibilityRole="button"
                >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

      </View>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (t: AppTheme) => StyleSheet.create({
  flex: { flex: 1 },

  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },

  // ── Add Player Form
  formCard: {
    backgroundColor: t.colors.card,
    margin: t.spacing.md,
    borderRadius: 12,
    padding: t.spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  formTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: t.colors.text,
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: t.spacing.sm,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: t.colors.text,
    marginBottom: 4,
    marginTop: 2,
  },
  required: {
    color: t.colors.danger,
  },
  optional: {
    fontWeight: '400',
    color: t.colors.border,
  },
  input: {
    height: 42,
    borderColor: t.colors.border,
    borderWidth: 1,
    marginBottom: t.spacing.sm,
    paddingHorizontal: t.spacing.sm,
    borderRadius: 8,
    color: t.colors.text,
    backgroundColor: t.colors.background,
    fontSize: 15,
  },
  addButton: {
    backgroundColor: t.colors.primary,
    borderRadius: 8,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.xs,
    marginTop: 4,
  },
  addButtonDisabled: {
    opacity: 0.45,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  // ── List header
  listHeader: {
    paddingHorizontal: t.spacing.md + t.spacing.xs,
    paddingBottom: t.spacing.xs,
  },
  listHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: t.colors.text,
    opacity: 0.45,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  listContent: {
    paddingHorizontal: t.spacing.md,
    paddingBottom: t.spacing.xl,
  },

  // ── Player rows
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.card,
    paddingVertical: t.spacing.sm,
    paddingHorizontal: t.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  // Rounded top corners on first item
  playerItemFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  // Rounded bottom corners + no bottom border on last item
  playerItemLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },

  // Jersey number circular badge
  jerseyBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.colors.background,
    borderWidth: 1.5,
    borderColor: t.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: t.spacing.sm,
  },
  jerseyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: t.colors.primary,
  },

  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '600',
    color: t.colors.text,
  },
  playerPosition: {
    fontSize: 13,
    color: t.colors.text,
    opacity: 0.55,
    marginTop: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: t.spacing.sm,
  },

  // ── Empty state
  emptyContainer: {
    alignItems: 'center',
    marginTop: t.spacing.xl,
    paddingHorizontal: t.spacing.lg,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: t.colors.text,
    marginTop: t.spacing.md,
  },
  emptySubText: {
    fontSize: 14,
    color: t.colors.text,
    opacity: 0.5,
    marginTop: t.spacing.xs,
    textAlign: 'center',
  },

  // ── Edit Modal (bottom sheet)
  // Bug fix: flex:1 + justifyContent:'flex-end' so the sheet sits at the bottom.
  // The Pressable backdrop uses absoluteFill and does NOT affect layout flow.
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: t.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: t.spacing.md,
    paddingBottom: t.spacing.xl,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: t.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: t.spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: t.colors.text,
    marginBottom: t.spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: t.spacing.sm,
    marginTop: t.spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: t.colors.background,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: t.colors.text,
  },
  saveButton: {
    backgroundColor: t.colors.primary,
  },
  saveButtonDisabled: {
    opacity: 0.45,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default TeamRosterScreen;
