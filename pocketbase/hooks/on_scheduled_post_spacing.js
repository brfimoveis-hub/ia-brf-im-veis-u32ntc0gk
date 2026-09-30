/// <reference path="../pb_data/types.d.ts" />

/**
 * Validação de espaçamento mínimo entre posts agendados no Instagram.
 * Proteção anti-saturação solicitada pelo usuário (Mauro - BRF Imóveis).
 *
 * Dispara tanto na criação quanto na atualização de registros na coleção 'scheduled_posts'.
 * Se o status for 'agendado', garante que nenhum outro post 'agendado' do mesmo usuário
 * esteja a menos de N minutos (configurado em users.posts_min_interval_minutes, padrão 60 min).
 *
 * OBS: No JSVM do PocketBase (Goja), toda a lógica precisa ficar inline dentro do callback.
 */

onRecordCreate((e) => {
  var record = e.record
  var status = record.getString('status')
  if (status === 'agendado') {
    var scheduledAtRaw = record.getString('scheduled_at')
    if (scheduledAtRaw && scheduledAtRaw.trim()) {
      var userId = record.getString('user_id')
      if (!userId) {
        try {
          var defaultUser = $app.findFirstRecordByData('users', 'email', 'brfimoveis@gmail.com')
          if (defaultUser) {
            userId = defaultUser.id
            record.set('user_id', userId)
          }
        } catch (_) {}
      }

      var intervalMinutes = 60
      if (userId) {
        try {
          var user = $app.findRecordById('users', userId)
          var userInterval = user.getInt('posts_min_interval_minutes')
          if (userInterval && userInterval > 0) {
            intervalMinutes = userInterval
          }
        } catch (_) {}
      }

      var targetDate = new Date(scheduledAtRaw.replace(' ', 'T'))
      var targetTime = targetDate.getTime()
      if (!isNaN(targetTime)) {
        var intervalMs = intervalMinutes * 60 * 1000
        var windowMs = 24 * 60 * 60 * 1000
        var minWindowIso = new Date(targetTime - windowMs)
          .toISOString()
          .replace('T', ' ')
          .slice(0, 19)
        var maxWindowIso = new Date(targetTime + windowMs)
          .toISOString()
          .replace('T', ' ')
          .slice(0, 19)

        var filter =
          "status = 'agendado' && scheduled_at >= '" +
          minWindowIso +
          "' && scheduled_at <= '" +
          maxWindowIso +
          "'"
        if (userId) {
          filter = "user_id = '" + userId + "' && " + filter
        }

        var candidates = []
        try {
          candidates = $app.findRecordsByFilter('scheduled_posts', filter, 'scheduled_at', 100, 0)
        } catch (err) {
          $app.logger().warn('Erro ao consultar posts para espaçamento:', 'error', String(err))
        }

        var currentId = record.id || ''
        var otherPosts = []
        for (var i = 0; i < candidates.length; i++) {
          var c = candidates[i]
          if (currentId && c.id === currentId) {
            continue
          }
          var cDate = new Date(c.getString('scheduled_at').replace(' ', 'T'))
          var cTime = cDate.getTime()
          if (!isNaN(cTime)) {
            otherPosts.push({ id: c.id, time: cTime, date: cDate })
          }
        }

        if (otherPosts.length > 0) {
          otherPosts.sort(function (a, b) {
            return a.time - b.time
          })

          var conflictingPost = null
          for (var j = 0; j < otherPosts.length; j++) {
            var diff = Math.abs(targetTime - otherPosts[j].time)
            if (diff < intervalMs) {
              conflictingPost = otherPosts[j]
              break
            }
          }

          if (conflictingPost) {
            var utc =
              conflictingPost.date.getTime() + conflictingPost.date.getTimezoneOffset() * 60000
            var brDate = new Date(utc - 3 * 3600000)
            var hh = String(brDate.getHours()).padStart(2, '0')
            var mm = String(brDate.getMinutes()).padStart(2, '0')
            var conflictTimeFormatted = hh + ':' + mm

            var candidateFreeTime = conflictingPost.time + intervalMs
            if (candidateFreeTime <= targetTime) {
              candidateFreeTime = targetTime + intervalMs
            }

            var found = false
            for (var attempt = 0; attempt < 24; attempt++) {
              var hasOverlap = false
              for (var k = 0; k < otherPosts.length; k++) {
                if (Math.abs(candidateFreeTime - otherPosts[k].time) < intervalMs) {
                  candidateFreeTime = otherPosts[k].time + intervalMs
                  hasOverlap = true
                  break
                }
              }
              if (!hasOverlap) {
                found = true
                break
              }
            }

            var freeTimeFormatted = 'outro horário'
            if (found) {
              var freeDate = new Date(candidateFreeTime)
              var freeUtc = freeDate.getTime() + freeDate.getTimezoneOffset() * 60000
              var freeBr = new Date(freeUtc - 3 * 3600000)
              freeTimeFormatted =
                String(freeBr.getHours()).padStart(2, '0') +
                ':' +
                String(freeBr.getMinutes()).padStart(2, '0')
            }

            var intervalDesc =
              intervalMinutes >= 60
                ? intervalMinutes === 60
                  ? '1 hora'
                  : intervalMinutes / 60 + ' horas'
                : intervalMinutes + ' minutos'

            var errorMessage =
              'Este horário está muito perto do post das ' +
              conflictTimeFormatted +
              '. Posts precisam de pelo menos ' +
              intervalDesc +
              ' de intervalo para não saturar o Instagram. Próximo horário livre: ' +
              freeTimeFormatted +
              '.'

            throw new BadRequestError(errorMessage, {
              scheduled_at: new ValidationError('min_interval_conflict', errorMessage),
            })
          }
        }
      }
    }
  }
  return e.next()
}, 'scheduled_posts')

onRecordUpdate((e) => {
  var record = e.record
  var status = record.getString('status')
  if (status === 'agendado') {
    var scheduledAtRaw = record.getString('scheduled_at')
    if (scheduledAtRaw && scheduledAtRaw.trim()) {
      var userId = record.getString('user_id')
      if (!userId) {
        try {
          var defaultUser = $app.findFirstRecordByData('users', 'email', 'brfimoveis@gmail.com')
          if (defaultUser) {
            userId = defaultUser.id
            record.set('user_id', userId)
          }
        } catch (_) {}
      }

      var intervalMinutes = 60
      if (userId) {
        try {
          var user = $app.findRecordById('users', userId)
          var userInterval = user.getInt('posts_min_interval_minutes')
          if (userInterval && userInterval > 0) {
            intervalMinutes = userInterval
          }
        } catch (_) {}
      }

      var targetDate = new Date(scheduledAtRaw.replace(' ', 'T'))
      var targetTime = targetDate.getTime()
      if (!isNaN(targetTime)) {
        var intervalMs = intervalMinutes * 60 * 1000
        var windowMs = 24 * 60 * 60 * 1000
        var minWindowIso = new Date(targetTime - windowMs)
          .toISOString()
          .replace('T', ' ')
          .slice(0, 19)
        var maxWindowIso = new Date(targetTime + windowMs)
          .toISOString()
          .replace('T', ' ')
          .slice(0, 19)

        var filter =
          "status = 'agendado' && scheduled_at >= '" +
          minWindowIso +
          "' && scheduled_at <= '" +
          maxWindowIso +
          "'"
        if (userId) {
          filter = "user_id = '" + userId + "' && " + filter
        }

        var candidates = []
        try {
          candidates = $app.findRecordsByFilter('scheduled_posts', filter, 'scheduled_at', 100, 0)
        } catch (err) {
          $app.logger().warn('Erro ao consultar posts para espaçamento:', 'error', String(err))
        }

        var currentId = record.id || ''
        var otherPosts = []
        for (var i = 0; i < candidates.length; i++) {
          var c = candidates[i]
          if (currentId && c.id === currentId) {
            continue
          }
          var cDate = new Date(c.getString('scheduled_at').replace(' ', 'T'))
          var cTime = cDate.getTime()
          if (!isNaN(cTime)) {
            otherPosts.push({ id: c.id, time: cTime, date: cDate })
          }
        }

        if (otherPosts.length > 0) {
          otherPosts.sort(function (a, b) {
            return a.time - b.time
          })

          var conflictingPost = null
          for (var j = 0; j < otherPosts.length; j++) {
            var diff = Math.abs(targetTime - otherPosts[j].time)
            if (diff < intervalMs) {
              conflictingPost = otherPosts[j]
              break
            }
          }

          if (conflictingPost) {
            var utc =
              conflictingPost.date.getTime() + conflictingPost.date.getTimezoneOffset() * 60000
            var brDate = new Date(utc - 3 * 3600000)
            var hh = String(brDate.getHours()).padStart(2, '0')
            var mm = String(brDate.getMinutes()).padStart(2, '0')
            var conflictTimeFormatted = hh + ':' + mm

            var candidateFreeTime = conflictingPost.time + intervalMs
            if (candidateFreeTime <= targetTime) {
              candidateFreeTime = targetTime + intervalMs
            }

            var found = false
            for (var attempt = 0; attempt < 24; attempt++) {
              var hasOverlap = false
              for (var k = 0; k < otherPosts.length; k++) {
                if (Math.abs(candidateFreeTime - otherPosts[k].time) < intervalMs) {
                  candidateFreeTime = otherPosts[k].time + intervalMs
                  hasOverlap = true
                  break
                }
              }
              if (!hasOverlap) {
                found = true
                break
              }
            }

            var freeTimeFormatted = 'outro horário'
            if (found) {
              var freeDate = new Date(candidateFreeTime)
              var freeUtc = freeDate.getTime() + freeDate.getTimezoneOffset() * 60000
              var freeBr = new Date(freeUtc - 3 * 3600000)
              freeTimeFormatted =
                String(freeBr.getHours()).padStart(2, '0') +
                ':' +
                String(freeBr.getMinutes()).padStart(2, '0')
            }

            var intervalDesc =
              intervalMinutes >= 60
                ? intervalMinutes === 60
                  ? '1 hora'
                  : intervalMinutes / 60 + ' horas'
                : intervalMinutes + ' minutos'

            var errorMessage =
              'Este horário está muito perto do post das ' +
              conflictTimeFormatted +
              '. Posts precisam de pelo menos ' +
              intervalDesc +
              ' de intervalo para não saturar o Instagram. Próximo horário livre: ' +
              freeTimeFormatted +
              '.'

            throw new BadRequestError(errorMessage, {
              scheduled_at: new ValidationError('min_interval_conflict', errorMessage),
            })
          }
        }
      }
    }
  }
  return e.next()
}, 'scheduled_posts')
