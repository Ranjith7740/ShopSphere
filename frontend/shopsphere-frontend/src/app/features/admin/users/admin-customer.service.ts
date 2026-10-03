import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { UserResponse, UserPageResponse } from '../../../core/models/user.model';

@Injectable({ providedIn: 'root' })
export class AdminCustomerService {
  private readonly http = inject(HttpClient);

  private readonly adminUsersUrl = `${environment.apiUrl}/admin/users`;

  getCustomers(page: number, size: number, search: string): Observable<UserPageResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<UserPageResponse>(this.adminUsersUrl, { params });
  }
}
