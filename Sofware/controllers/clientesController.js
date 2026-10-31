import { query } from '../db/index.js';

export const getClientes = async (req, res) => {
  try {
    const { estado, q } = req.query;
    const params = [];
    let sql = 'SELECT * FROM clientes WHERE 1=1';

    if (estado) {
      params.push(estado);
      sql += ` AND estado = $${params.length}`;
    }
    if (q) {
      params.push(`%${q}%`);
      sql += ` AND (nombre ILIKE $${params.length} OR num_doc ILIKE $${params.length})`;
    }
    sql += ' ORDER BY nombre';

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getClienteById = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM clientes WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createCliente = async (req, res) => {
  const { usuario_id, nombre, tipo_doc, num_doc, telefono, email, direccion, notas, estado } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO clientes
        (usuario_id, nombre, tipo_doc, num_doc, telefono, email, direccion, notas, estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE($9,'ACTIVO'))
       RETURNING *`,
      [usuario_id, nombre, tipo_doc, num_doc, telefono, email, direccion, notas, estado]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const updateCliente = async (req, res) => {
  const { id } = req.params;
  const { nombre, tipo_doc, num_doc, telefono, email, direccion, notas, estado } = req.body;
  try {
    const { rows } = await query(
      `UPDATE clientes SET
         nombre    = COALESCE($1, nombre),
         tipo_doc  = COALESCE($2, tipo_doc),
         num_doc   = COALESCE($3, num_doc),
         telefono  = COALESCE($4, telefono),
         email     = COALESCE($5, email),
         direccion = COALESCE($6, direccion),
         notas     = COALESCE($7, notas),
         estado    = COALESCE($8, estado)
       WHERE id = $9 RETURNING *`,
      [nombre, tipo_doc, num_doc, telefono, email, direccion, notas, estado, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteCliente = async (req, res) => {
  // Soft delete → cambia estado a INACTIVO
  try {
    const { rows } = await query(
      `UPDATE clientes SET estado = 'INACTIVO' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ mensaje: 'Cliente desactivado', cliente: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};