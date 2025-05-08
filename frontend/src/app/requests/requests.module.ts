import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { LayoutComponent } from './layout.component';
import { ListComponent } from './list.component';
import { AddEditComponent } from './add-edit.component';
import { ViewComponent } from './view.component';
import { MyRequestsComponent } from './my-requests.component';
import { AssignedToMeComponent } from './assigned-to-me.component';

const routes = [
    {
        path: '', component: LayoutComponent,
        children: [
            { path: '', redirectTo: 'my-requests', pathMatch: 'full' as 'full' },
            { path: 'all', component: ListComponent },
            { path: 'my-requests', component: MyRequestsComponent },
            { path: 'assigned-to-me', component: AssignedToMeComponent },
            { path: 'add', component: AddEditComponent },
            { path: 'edit/:id', component: AddEditComponent },
            { path: 'view/:id', component: ViewComponent }
        ]
    }
];

@NgModule({
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule.forChild(routes)
    ],
    declarations: [
        LayoutComponent,
        ListComponent,
        AddEditComponent,
        ViewComponent,
        MyRequestsComponent,
        AssignedToMeComponent
    ]
})
export class RequestsModule { } 