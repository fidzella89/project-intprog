import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { LayoutComponent } from './layout.component';
import { ListComponent } from './list.component';
import { AddEditComponent } from './add-edit.component';
import { ViewComponent } from './view.component';
import { MyRequestsComponent } from './my-requests.component';

const routes: Routes = [
    {
        path: '', component: LayoutComponent,
        children: [
            { path: '', component: ListComponent },
            { path: 'my-requests', component: MyRequestsComponent },
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
        MyRequestsComponent
    ]
})
export class RequestsModule { } 