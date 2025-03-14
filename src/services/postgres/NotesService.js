/* eslint-disable no-underscore-dangle */
const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../../exceptions/InvariantError');
const { mapDBToModel } = require('../../utils');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');

class NotesService {
  // constructor sebelum kolaborasi
  // constructor() {
  //   this._pool = new Pool();
  // }

  // constructor setelah kolaborasi
  // constructor(collaborationService) {
  //   this._pool = new Pool();
  //   this._collaborationService = collaborationService;
  // }

  // constructor setelah caching
  constructor(collaborationService, cacheService) {
    this._pool = new Pool();
    this._collaborationService = collaborationService;
    this._cacheService = cacheService;
  }

  async addNote({
    title, body, tags, owner,
  }) {
    const id = nanoid(16);
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const query = {
      text: 'INSERT INTO notes VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      values: [id, title, body, tags, createdAt, updatedAt, owner],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Catatan gagal ditambahkan');
    }

    await this._cacheService.delete(`notes:${owner}`); // caching
    return result.rows[0].id;
  }

  // getNotes sebelum caching
  // async getNotes(owner) {
  //   // sebelum kolaborasi
  //   // const query = {
  //   //   text: 'SELECT * FROM notes WHERE owner = $1',
  //   //   values: [owner],
  //   // };
  //   // kolaborasi
  //   const query = {
  //     text: `SELECT notes.* FROM notes
  //     LEFT JOIN collaborations ON collaborations.note_id = notes.id
  //     WHERE notes.owner = $1 OR collaborations.user_id = $1
  //     GROUP BY notes.id`,
  //     values: [owner],
  //   };
  //   const result = await this._pool.query(query);
  //   return result.rows.map(mapDBToModel);
  // }

// getNotes setelah caching
async getNotes(owner) {
  try {
    // mendapatkan catatan dari cache
    const result = await this._cacheService.get(`notes:${owner}`);
    return JSON.parse(result);
  } catch (error) {
    // bila gagal, diteruskan dengan mendapatkan catatan dari database
    const query = {
      text: `SELECT notes.* FROM notes
      LEFT JOIN collaborations ON collaborations.note_id = notes.id
      WHERE notes.owner = $1 OR collaborations.user_id = $1
      GROUP BY notes.id`,
      values: [owner],
    };

    const result = await this._pool.query(query);
    const mappedResult = result.rows.map(mapDBToModel);

   // catatan akan disimpan pada cache sebelum fungsi getNotes dikembalikan
    await this._cacheService.set(`notes:${owner}`, JSON.stringify(mappedResult));

    return mappedResult;
  }
}

  // sebelum kolaborasi
  // async getNoteById(id)
  

  //   async getNoteById(id) {
  //   const query = {
  //     text: `SELECT notes.*, users.username
  //     FROM notes
  //     LEFT JOIN users ON users.id = notes.owner
  //     WHERE notes.id = $1`,
  //     values: [id],
  //   };
  //   const result = await this._pool.query(query);
 
  //   if (!result.rows.length) {
  //     throw new NotFoundError('Catatan tidak ditemukan');
  //   }
 
  //   return result.rows.map(mapDBToModel)[0];
  // }

  // setelah kolaborasi
  async getNoteById(id) {
    const query = {
      text: `SELECT notes.*, users.username
    FROM notes
    LEFT JOIN users ON users.id = notes.owner
    WHERE notes.id = $1`,
      values: [id],
    };
    const result = await this._pool.query(query);
 
    if (!result.rows.length) {
      throw new NotFoundError('Catatan tidak ditemukan');
    }
 
    return result.rows.map(mapDBToModel)[0];
  }

  async editNoteById(id, { title, body, tags }) {
    const updatedAt = new Date().toISOString();
    const query = {
      text: 'UPDATE notes SET title = $1, body = $2, tags = $3, updated_at = $4 WHERE id = $5 RETURNING id, owner',  // return owner for caching
      values: [title, body, tags, updatedAt, id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Gagal memperbarui catatan. Id tidak ditemukan');
    }

    // caching
    const { owner } = result.rows[0];
    await this._cacheService.delete(`notes:${owner}`);
  }

  async deleteNoteById(id) {
    const query = {
      text: 'DELETE FROM notes WHERE id = $1 RETURNING id, owner', // return owner for caching
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Catatan gagal dihapus. Id tidak ditemukan');
    }

    // caching
    const { owner } = result.rows[0];
    await this._cacheService.delete(`notes:${owner}`);
  }

  async verifyNoteOwner(id, owner) {
    const query = {
      text: 'SELECT * FROM notes WHERE id = $1',
      values: [id],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError('Catatan tidak ditemukan');
    }
    const note = result.rows[0];
    if (note.owner !== owner) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }

  async verifyNoteAccess(noteId, userId) {
    try {
      await this.verifyNoteOwner(noteId, userId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
    }
  }
}

module.exports = NotesService;
