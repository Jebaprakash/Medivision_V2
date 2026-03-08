/**
 * Doctor Controller — handles HTTP request/response for doctor endpoints.
 * Delegates business logic to doctorService.
 */
const doctorService = require('../services/doctorService');
const pool = require('../database/pool');

/**
 * GET /api/doctors?specialization=X&city=Y&available=true&page=1&limit=10
 */
async function listDoctors(req, res, next) {
    try {
        const { specialization, city, available, page, limit } = req.query;
        const result = await doctorService.getDoctors(
            { specialization, city, available },
            { page, limit }
        );
        res.json(result);
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/doctors/specializations
 */
async function listSpecializations(req, res, next) {
    try {
        const specializations = await doctorService.getSpecializations();
        res.json({ specializations });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/doctors/cities
 */
async function listCities(req, res, next) {
    try {
        const cities = await doctorService.getCities();
        res.json({ cities });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/doctors/:id
 */
async function getDoctorById(req, res, next) {
    try {
        const doctor = await doctorService.getDoctorById(req.params.id);
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        res.json(doctor);
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/doctors/consultations/book
 */
async function bookConsultation(req, res, next) {
    try {
        const { doctorId, scheduledAt, notes, diagnosisId } = req.body;
        const userId = req.user.id;

        if (!doctorId || !scheduledAt) {
            return res.status(400).json({ error: 'Doctor ID and scheduled time are required' });
        }

        const doctor = await doctorService.getDoctorById(doctorId);
        if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
        if (!doctor.is_available) return res.status(409).json({ error: 'Doctor is currently unavailable' });

        const result = await pool.query(
            `INSERT INTO doctor_consultations (user_id, doctor_id, scheduled_at, notes, diagnosis_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [userId, doctorId, scheduledAt, notes || null, diagnosisId || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/doctors/consultations/user
 */
async function getUserConsultations(req, res, next) {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            `SELECT dc.*, d.name as doctor_name, d.specialization, d.hospital,
                    d.avatar_url, d.city
             FROM doctor_consultations dc
             JOIN doctors d ON d.id = dc.doctor_id
             WHERE dc.user_id = $1
             ORDER BY dc.scheduled_at DESC`,
            [userId]
        );
        res.json({ consultations: result.rows });
    } catch (error) {
        next(error);
    }
}

/**
 * PATCH /api/doctors/consultations/:id/status
 */
async function updateConsultationStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const valid = ['scheduled', 'in_progress', 'completed', 'cancelled'];
        if (!valid.includes(status)) {
            return res.status(400).json({ error: `Status must be one of: ${valid.join(', ')}` });
        }
        const result = await pool.query(
            'UPDATE doctor_consultations SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Consultation not found' });
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
}

module.exports = {
    listDoctors,
    listSpecializations,
    listCities,
    getDoctorById,
    bookConsultation,
    getUserConsultations,
    updateConsultationStatus,
};
