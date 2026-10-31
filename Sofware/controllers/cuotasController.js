import { query } from '../db/index.js';

export const getCuotas = async (req, res) => {
  try {
    const { prestamo_id, estado } = req.query;
    const params = [];
    let sql = 'SELECT * FROM cuotas WHERE 1=1';
    if (prestamo_id) { params.push(prestamo_id); sql += ` AND prestamo_id = $${params.length}`; }
    if (estado)      { params.push(estado);      sql += ` AND estado = $${params.length}`; }
    sql += ' ORDER BY prestamo_id, numero';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getCuotaById = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM cuotas WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Cuota no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Solo se permite actualizar estado manualmente (raro) o fecha_límite
export const updateCuota = async (req, res) => {
  const { fecha_limite, estado } = req.body;
  try {
    const { rows } = await query(
      `UPDATE cuotas SET
         fecha_limite = COALESCE($1, fecha_limite),
         estado       = COALESCE($2, estado)
       WHERE id = $3 RETURNING *`,
      [fecha_limite, estado, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Cuota no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};