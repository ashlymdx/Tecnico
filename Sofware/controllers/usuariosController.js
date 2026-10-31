import { query } from '../db/index.js';

export const getUsuarios = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, email, nombre FROM usuarios ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getUsuarioById = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, email, nombre FROM usuarios WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};