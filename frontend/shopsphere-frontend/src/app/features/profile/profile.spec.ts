import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { Profile } from './profile';
import { AuthService } from '../../core/services/auth.service';
import { UserResponse } from '../../core/models/user.model';

const USER: UserResponse = {
  id: 1,
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '9876543210',
  role: 'CUSTOMER',
};

describe('Profile', () => {
  function createFixture(currentUser: UserResponse | null) {
    TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser: signal(currentUser).asReadonly() } },
      ],
    });

    return TestBed.createComponent(Profile);
  }

  it('shows the current user summary', () => {
    const fixture = createFixture(USER);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Jane Doe');
    expect(text).toContain('jane@example.com');
  });

  it('links to the addresses page', () => {
    const fixture = createFixture(USER);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a[href="/profile/addresses"]');
    expect(link).toBeTruthy();
  });
});
