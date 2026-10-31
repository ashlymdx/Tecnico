import { query } from '../db/index.js';

// Suma días según periodicidad
function avanzarFecha(fecha, periodicidad, n) {
  const d = new Date(fecha);
  switch (periodicidad) {
    case 'SEMANAL':    d.setDate(d.getDate() + 7 * n); break;
    case 'QUINCENAL':  d.setDate(d.getDate() + 15 * n); break;
    case 'MENSUAL':    d.setMonth(d.getMonth() + n); break;
  }
  return d.toISOString().slice(0, 10);
}

export const getPrestamos = async (req, res) => {
  try {
    const { estado, cliente_id } = req.query;
    const params = [];
    let sql = `
      SELECT p.*, c.nombre AS cliente_nombre
      FROM prestamos p
      JOIN clientes c ON c.id = p.cliente_id
      WHERE 1=1`;
    if (estado)     { params.push(estado);     sql += ` AND p.estado = $${params.length}`; }
    if (cliente_id) { params.push(cliente_id); sql += ` AND p.cliente_id = $${params.length}`; }
    sql += ' ORDER BY p.created_at DESC';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getPrestamoById = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT p.*, c.nombre AS cliente_nombre
       FROM prestamos p JOIN clientes c ON c.id = p.cliente_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Préstamo no encontrado' });

    const cuotas = await query(
      'SELECT * FROM cuotas WHERE prestamo_id = $1 ORDER BY numero',
      [req.params.id]
    );

    res.json({ ...rows[0], cuotas: cuotas.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST — crea el préstamo y genera automáticamente las cuotas
export const createPrestamo = async (req, res) => {
  const {
    cliente_id, monto, tasa_pct, n_cuotas, periodicidad,
    fecha_desembolso, fecha_primera_cuota, observacion,
  } = req.body;

  try {
    // Validación básica
    if (!cliente_id || !monto || !n_cuotas || !periodicidad) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const totalPagar = Number((monto * (1 + tasa_pct / 100)).toFixed(2));
    const montoCuota = Number((totalPagar / n_cuotas).toFixed(2));
    // Ajuste por redondeo en la última cuota
    const ajuste     = Number((totalPagar - montoCuota * (n_cuotas - 1)).toFixed(2));

    // 1. Insertar préstamo
    const { rows } = await query(
      `INSERT INTO prestamos
         (cliente_id, monto, tasa_pct, n_cuotas, periodicidad,
          fecha_desembolso, fecha_primera_cuota, observacion,
          total_pagar, saldo, estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,'ACTIVO')
       RETURNING *`,
      [cliente_id, monto, tasa_pct, n_cuotas, periodicidad,
       fecha_desembolso, fecha_primera_cuota, observacion, totalPagar]
    );
    const prestamo = rows[0];

    // 2. Generar cuotas
    for (let i = 1; i <= n_cuotas; i++) {
      const fechaLimite = avanzarFecha(fecha_primera_cuota, periodicidad, i - 1);
      const montoCuotaI = i === n_cuotas ? ajuste : montoCuota;
      await query(
        `INSERT INTO cuotas (prestamo_id, numero, fecha_limite, monto)
         VALUES ($1,$2,$3,$4)`,
        [prestamo.id, i, fechaLimite, montoCuotaI]
      );
    }

    // 3. Devolver con cuotas
    const cuotas = await query(
      'SELECT * FROM cuotas WHERE prestamo_id = $1 ORDER BY numero',
      [prestamo.id]
    );

    res.status(201).json({ ...prestamo, cuotas: cuotas.rows });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const updatePrestamo = async (req, res) => {
  // Solo campos editables: observación y estado
  const { observacion, estado } = req.body;
  try {
    const { rows } = await query(
      `UPDATE prestamos SET
         observacion = COALESCE($1, observacion),
         estado      = COALESCE($2, estado)
       WHERE id = $3 RETURNING *`,
      [observacion, estado, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Préstamo no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deletePrestamo = async (req, res) => {
  // Soft delete → CANCELADO
  try {
    const { rows } = await query(
      `UPDATE prestamos SET estado = 'CANCELADO' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Préstamo no encontrado' });
    res.json({ mensaje: 'Préstamo cancelado', prestamo: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};