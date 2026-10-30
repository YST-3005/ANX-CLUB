import {adminDb, logFirestoreFallback} from '@/lib/firebase/admin';
const db = adminDb;
import { ProjectInfo } from '@/modules/module2/types/dashboard';
import { getProjectsByUserId } from '@/modules/module2/data';
import * as admin from 'firebase-admin';

export async function getProjects(
  userId: string,
  mock = false,
  fail = false
): Promise<ProjectInfo[]> {
  if (fail) {
    throw new Error('Simulated failure in Project Service');
  }

  if (mock) {
    return getProjectsByUserId(userId);
  }

  if (db) {
    try {
      const membersQuery = db.collection('projects')
        .where('members', 'array-contains', userId)
        .get();

      const directQuery = db.collection('projects')
        .where('userId', '==', userId)
        .get();

      // Also query submitted ideas in product incubator as projects
      const ideasQuery = db.collection('ideas')
        .where('submitterId', '==', userId)
        .get();

      const [membersSnapshot, directSnapshot, ideasSnapshot] = await Promise.all([
        membersQuery,
        directQuery,
        ideasQuery
      ]);

      const projectsMap = new Map<string, ProjectInfo>();

      const addDocs = (snapshot: admin.firestore.QuerySnapshot) => {
        snapshot.forEach(doc => {
          const data = doc.data();
          projectsMap.set(doc.id, {
            id: doc.id,
            title: data.title || '',
            description: data.description || data.problemStatement || '',
            status: data.status || 'Active',
            role: data.role || 'Author',
          });
        });
      };

      addDocs(membersSnapshot);
      addDocs(directSnapshot);
      addDocs(ideasSnapshot);

      return Array.from(projectsMap.values());
    } catch (error) {
      logFirestoreFallback('Projects service', error);
      return [];
    }
  }

  return [];
}
