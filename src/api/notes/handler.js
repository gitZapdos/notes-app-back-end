/* eslint-disable no-underscore-dangle */
const ClientError = require('../../exceptions/ClientError');

class NotesHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;

    this.postNoteHandler = this.postNoteHandler.bind(this);
    this.getNotesHandler = this.getNotesHandler.bind(this);
    this.getNoteByIdHandler = this.getNoteByIdHandler.bind(this);
    this.putNoteByIdHandler = this.putNoteByIdHandler.bind(this);
    this.deleteNoteByIdHandler = this.deleteNoteByIdHandler.bind(this);
  }
  // sebelum otorisasi
  // async postNoteHandler(request, h) {
  //   this._validator.validateNotePayload(request.payload);
  //   const { title = 'untitled', body, tags } = request.payload;

  //   const noteId = await this._service.addNote({ title, body, tags });

  //   const response = h.response({
  //     status: 'success',
  //     message: 'Catatan berhasil ditambahkan',
  //     data: {
  //       noteId,
  //     },
  //   });
  //   response.code(201);
  //   return response;
  // }

  async postNoteHandler(request, h) {
    try {
      this._validator.validateNotePayload(request.payload);
      const { title = 'untitled', body, tags } = request.payload;
      const { id: credentialId } = request.auth.credentials;
      const noteId = await this._service.addNote({
        title, body, tags, owner: credentialId,
      });

      const response = h.response({
        status: 'success',
        message: 'Catatan berhasil ditambahkan',
        data: {
          noteId,
        },
      });
      response.code(201);
      return response;
    } catch (error) {
      if (error instanceof ClientError) {
        const response = h.response({
          status: 'fail',
          message: error.message,
        });
        response.code(error.statusCode);
        return response;
      }

      // Server ERROR!
      const response = h.response({
        status: 'error',
        message: 'Maaf, terjadi kegagalan pada server kami.',
      });
      response.code(500);
      console.error(error);
      return response;
    }
  }
  // sebelum otorisasi
  // async getNotesHandler() {
  //   const notes = await this._service.getNotes();
  //   return {
  //     status: 'success',
  //     data: {
  //       notes,
  //     },
  //   };
  // }

  async getNotesHandler(request) {
    const { id: credentialId } = request.auth.credentials;
    const notes = await this._service.getNotes(credentialId);
    return {
      status: 'success',
      data: {
        notes,
      },
    };
  }

  // sebelum otorisasi
  // async getNoteByIdHandler(request, h) {
  //   const { id } = request.params;
  //   const note = await this._service.getNoteById(id);
  //   return {
  //     status: 'success',
  //     data: {
  //       note,
  //     },
  //   };
  // }

  async getNoteByIdHandler(request, h) {
    try {
      const { id } = request.params;
      const { id: credentialId } = request.auth.credentials;

      await this._service.verifyNoteOwner(id, credentialId);
      const note = await this._service.getNoteById(id);

      return {
        status: 'success',
        data: {
          note,
        },
      };
    } catch (error) {
      if (error instanceof ClientError) {
        const response = h.response({
          status: 'fail',
          message: error.message,
        });
        response.code(error.statusCode);
        return response;
      }

      // Server ERROR!
      const response = h.response({
        status: 'error',
        message: 'Maaf, terjadi kegagalan pada server kami.',
      });
      response.code(500);
      console.error(error);
      return response;
    }
  }

  // sebelum otorisasi
  // async putNoteByIdHandler(request, h) {
  //   this._validator.validateNotePayload(request.payload);
  //   const { id } = request.params;

  //   await this._service.editNoteById(id, request.payload);

  //   return {
  //     status: 'success',
  //     message: 'Catatan berhasil diperbarui',
  //   };
  // }

  async putNoteByIdHandler(request, h) {
    try {
      this._validator.validateNotePayload(request.payload);
      const { id } = request.params;
      const { id: credentialId } = request.auth.credentials;
      await this._service.verifyNoteOwner(id, credentialId);
      await this._service.editNoteById(id, request.payload);

      return {
        status: 'success',
        message: 'Catatan berhasil diperbarui',
      };
    } catch (error) {
      if (error instanceof ClientError) {
        const response = h.response({
          status: 'fail',
          message: error.message,
        });
        response.code(error.statusCode);
        return response;
      }

      // Server ERROR!
      const response = h.response({
        status: 'error',
        message: 'Maaf, terjadi kegagalan pada server kami.',
      });
      response.code(500);
      console.error(error);
      return response;
    }
  }

  // sebelum otorisasi
  // async deleteNoteByIdHandler(request, h) {
  //   const { id } = request.params;
  //   await this._service.deleteNoteById(id);

  //   return {
  //     status: 'success',
  //     message: 'Catatan berhasil dihapus',
  //   };
  // }

  async deleteNoteByIdHandler(request, h) {
    try {
      const { id } = request.params;
      const { id: credentialId } = request.auth.credentials;
      await this._service.verifyNoteOwner(id, credentialId);
      await this._service.deleteNoteById(id);

      return {
        status: 'success',
        message: 'Catatan berhasil dihapus',
      };
    } catch (error) {
      if (error instanceof ClientError) {
        const response = h.response({
          status: 'fail',
          message: error.message,
        });
        response.code(error.statusCode);
        return response;
      }

      // Server ERROR!
      const response = h.response({
        status: 'error',
        message: 'Maaf, terjadi kegagalan pada server kami.',
      });
      response.code(500);
      console.error(error);
      return response;
    }
  }
}

module.exports = NotesHandler;
