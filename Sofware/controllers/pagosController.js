import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATA_BASE });

export const getPagos = async (req, res) => {
  try {
    const { prestamo_id, cuota_id } = req.query;
    const params = [];
    let sql = 'SELECT * FROM pagos WHERE 1=1';
    if (prestamo_id) { params.push(prestamo_id); sql += ` AND prestamo_id = $${params.length}`; }
    if (cuota_id)    { params.push(cuota_id);    sql += ` AND cuota_id = $${params.length}`; }
    sql += ' ORDER BY fecha_pago DESC, id DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createPago = async (req, res) => {
  const { cuota_id, prestamo_id, monto, fecha_pago, observacion } = req.body;

  if (!cuota_id || !prestamo_id || !monto) {
    return res.status(400).json({ error: 'cuota_id, prestamo_id y monto son obligatorios' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Bloquear la cuota para evitar condiciones de carrera
    const { rows: cuotaRows } = await client.query(
      'SELECT * FROM cuotas WHERE id = $1 FOR UPDATE',
      [cuota_id]
    );
    if (!cuotaRows.length) throw new Error('Cuota no encontrada');
    const cuota = cuotaRows[0];

    const pendiente = Number(cuota.monto) - Number(cuota.monto_pagado);
    if (Number(monto) > pendiente) {
      throw new Error(`El monto excede lo pendiente (${pendiente})`);
    }

    // 2. Insertar el pago
    const { rows: pagoRows } = await client.query(
      `INSERT INTO pagos (cuota_id, prestamo_id, monto, fecha_pago, observacion)
       VALUES ($1,$2,$3, COALESCE($4, CURRENT_DATE), $5)
       RETURNING *`,
      [cuota_id, prestamo_id, monto, fecha_pago, observacion]
    );

    // 3. Actualizar cuota
    const nuevoPagado = Number(cuota.monto_pagado) + Number(monto);
    let nuevoEstado;
    if (nuevoPagado >= Number(cuota.monto))       nuevoEstado = 'PAGADA';
    else if (nuevoPagado > 0)                     nuevoEstado = 'PARCIAL';
    else                                           nuevoEstado = 'PENDIENTE';

    await client.query(
      `UPDATE cuotas SET monto_pagado = $1, estado = $2 WHERE id = $3`,
      [nuevoPagado, nuevoEstado, cuota_id]
    );

    // 4. Actualizar saldo del préstamo
    const { rows: prestRows } = await client.query(
      `UPDATE prestamos
         SET saldo = saldo - $1
       WHERE id = $2 RETURNING *`,
      [monto, prestamo_id]
    );
    const prestamo = prestRows[0];

    // 5. Si saldo = 0 → marcar PAGADO
    if (Number(prestamo.saldo) <= 0) {
      await client.query(
        `UPDATE prestamos SET estado = 'PAGADO', saldo = 0 WHERE id = $1`,
        [prestamo_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ pago: pagoRows[0], cuota: { ...cuota, monto_pagado: nuevoPagado, estado: nuevoEstado } });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
};