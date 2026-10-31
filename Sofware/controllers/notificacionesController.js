import { query } from '../db/index.js';

export const getNotificaciones = async (req, res) => {
  try {
    const { leida, tipo } = req.query;
    const params = [];
    let sql = 'SELECT * FROM notificaciones WHERE 1=1';
    if (leida !== undefined) { params.push(leida === 'true'); sql += ` AND leida = $${params.length}`; }
    if (tipo)                { params.push(tipo);             sql += ` AND tipo = $${params.length}`; }
    sql += ' ORDER BY fecha_objetivo DESC, id DESC';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const marcarLeida = async (req, res) => {
  try {
    const { rows } = await query(
      'UPDATE notificaciones SET leida = TRUE WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Notificación no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createNotificacion = async (req, res) => {
  const { cuota_id, tipo, titulo, mensaje, fecha_objetivo } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO notificaciones (cuota_id, tipo, titulo, mensaje, fecha_objetivo)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [cuota_id, tipo, titulo, mensaje, fecha_objetivo]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};